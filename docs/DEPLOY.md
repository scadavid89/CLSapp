# Deployment runbook

Getting Contractor Leasing Solutions live: Azure SQL, an Azure Functions API, and a React front end on Azure Static Web Apps.

This is the full-stack version. Data lives in a database, not in the browser. Follow it top to bottom the first time — every step has a check, and if a check fails you stop there rather than compounding the problem.

**Time:** about 90 minutes end to end.
**Cost:** roughly $30–75/month for one yard. Itemised in Part 2.

---

## Contents

1. [Before you start](#1-before-you-start)
2. [What you're provisioning, and what it costs](#2-what-youre-provisioning-and-what-it-costs)
3. [Create the database](#3-create-the-database)
4. [Run the schema and seed](#4-run-the-schema-and-seed)
5. [Get the code into the repo](#5-get-the-code-into-the-repo)
6. [Clear the failing workflows](#6-clear-the-failing-workflows)
7. [The deployment token](#7-the-deployment-token)
8. [Create the Static Web App](#8-create-the-static-web-app)
9. [Connect the API to SQL with a managed identity](#9-connect-the-api-to-sql-with-a-managed-identity)
10. [Stage 1 — deploy and verify the API](#10-stage-1--deploy-and-verify-the-api)
11. [Stage 2 — require sign-in](#11-stage-2--require-sign-in)
12. [Stage 3 — roles and invitations](#12-stage-3--roles-and-invitations)
13. [Running locally](#13-running-locally)
14. [Operations](#14-operations)
15. [Troubleshooting](#15-troubleshooting)
16. [Rolling back](#16-rolling-back)

---

## 1. Before you start

**Accounts**

- GitHub, admin on the repository
- Azure, rights to create resources and to be set as SQL admin

**Tools**

| Tool | Why | Check |
|---|---|---|
| Node.js 20+ | Build the front end and API | `node -v` |
| Git | Push code | `git --version` |
| Azure Data Studio *or* SSMS *or* `sqlcmd` | Run the schema | — |
| Azure Functions Core Tools v4 | Run the API locally (optional) | `func --version` |

**Make the repository private** before anything goes in: Settings → General → Danger Zone → Change visibility. It holds customer names, rate cards, and connection details.

**A decision to make now:** what is your Entra (Microsoft Entra ID) group or account for SQL administration? Part 3 asks for it, and using your own account is fine for a single-operator setup.

---

## 2. What you're provisioning, and what it costs

An earlier version of this document recommended the free tiers. That advice does not survive contact with a working yard: the free Azure SQL grant is 100,000 vCore-seconds per month, and a database awake for a normal workday consumes it in about five days. After that it pauses and the app is simply down.

So this deployment uses paid, right-sized resources.

| Resource | SKU | Monthly | Why this one |
|---|---|---|---|
| Azure SQL Database | General Purpose **serverless**, 0.5–2 vCore, 1-hour auto-pause | **$15–50** | Scales to the workday and pauses overnight and at weekends. Cost tracks actual use |
| Static Web App | **Standard** | **$9** | Needed for a managed Functions API of any real size, custom auth, and an SLA |
| Application Insights | Pay-as-you-go | **$0–5** | First 5 GB/month free; this app won't approach it |
| Blob Storage | Hot LRS | **~$1** | Signed tickets and damage photos, later |
| Key Vault | Standard | **<$1** | Fractions of a cent per operation |

**Expect $30–75/month for one yard.** The database dominates and is the only line that moves with usage.

Two settings that matter more than the SKU choice:

- **Auto-pause at 1 hour.** Nights and weekends cost storage only. For a single-shift yard this is roughly a 60% saving over provisioned compute.
- **Min vCore 0.5, max 2.** The app is read-heavy with small writes. If the dashboard feels slow after a year of movement history, raise max before you raise min.

Set a **budget alert** before you create anything — Part 14.

---

## 3. Create the database

### Create the server and database

1. Azure portal → **Create a resource** → **SQL Database** → Create
2. Basics:

   | Field | Value |
   |---|---|
   | Resource group | create `rg-cls-prod` |
   | Database name | `cls` |
   | Server | **Create new** → `cls-sql-<yourinitials>` (must be globally unique) |
   | Location | East US 2 or Central US — **same region as the Static Web App** |
   | Authentication method | **Use Microsoft Entra-only authentication** |
   | Entra admin | **Set admin** → yourself |

   Entra-only authentication means there is no SQL password to leak, rotate, or commit. The API will connect with a managed identity.

3. **Configure database** (this is the important screen):

   | Field | Value |
   |---|---|
   | Service tier | **General Purpose — Serverless** |
   | Hardware | Standard-series (Gen5) |
   | Max vCores | 2 |
   | Min vCores | 0.5 |
   | **Auto-pause delay** | **1 hour** |
   | Data max size | 32 GB |
   | Backup storage redundancy | Locally-redundant (cheapest; geo only if you need it) |

4. **Networking**: set **Allow Azure services and resources to access this server** to **Yes**, and **Add current client IP address** to **Yes** so you can run the schema from your machine.
5. Review + create.

Provisioning takes about five minutes.

**Check:** the database appears in the portal with status *Online*.

### A note on the first query of the day

With auto-pause on, the first request after an idle period takes **30–60 seconds** while the database resumes. The app handles this — a failed bootstrap shows "the database may be waking up" with a retry button — but don't mistake it for a broken deployment.

---

## 4. Run the schema and seed

Three scripts, in order. Each is idempotent, so re-running is safe.

| Script | Creates |
|---|---|
| `sql/01-schema.sql` | Tables, constraints, indexes |
| `sql/02-availability.sql` | The availability function and the transactional stored procedures |
| `sql/03-seed.sql` | Config, catalog, contractors, jobsites, fleet, sample quotes |

### With Azure Data Studio or SSMS

1. Connect to `cls-sql-<yourinitials>.database.windows.net`, database `cls`, authentication **Microsoft Entra ID — Universal with MFA**.
2. Open each file, run it, confirm no errors. The seed prints `Seed complete.`

### With sqlcmd

```bash
sqlcmd -S cls-sql-<yourinitials>.database.windows.net -d cls -G \
  -i sql/01-schema.sql -i sql/02-availability.sql -i sql/03-seed.sql
```

**Check:**

```sql
SELECT COUNT(*) AS products FROM cls.Product;      -- 20
SELECT COUNT(*) AS assets   FROM cls.Asset;        -- 106
SELECT COUNT(*) AS quotes   FROM cls.Quote;        -- 5

-- the query the whole business runs on
SELECT * FROM cls.fnAvailability('SCL-1930', '2026-09-01', '2026-09-15', NULL);
```

That last one should return one row with `total_units`, `qty_held`, `qty_free`, and — when nothing is free — a `next_free_date`. If it returns sensible numbers, the interesting half of the schema is working.

### About the seed

`sql/03-seed.sql` carries the prototype's illustrative catalog. **Replace it with your real SKUs, rates, and customers before anyone quotes from it.** The two tables worth editing first are `cls.Product` (with `cls.ProductUom`) and `cls.Customer`. The seed uses `MERGE`, so you can edit the file and re-run rather than hand-writing updates.

---

## 5. Get the code into the repo

The repository must end up looking like this:

```
cls-rental-control/
├── .github/workflows/azure-static-web-apps.yml
├── api/                          Azure Functions — the API
│   ├── src/functions/*.js        endpoints
│   ├── shared/db.js              connection pool, transactions
│   ├── shared/auth.js            role enforcement
│   ├── host.json
│   └── package.json
├── sql/                          schema, availability, seed
├── src/                          React front end
│   ├── App.jsx  api.js  store.js  main.jsx
├── public/staticwebapp.config.json   ← MUST be here, not the root
├── docs/
├── index.html  package.json  package-lock.json  vite.config.js
├── .env.example  .gitignore  README.md
```

Three things that must be true: `staticwebapp.config.json` is in `public/`; no `node_modules/` is committed; no `dist/` is committed.

### Push with git

```bash
cd repo
npm install
npm run build
ls dist/staticwebapp.config.json      # must exist
npm ci --prefix api                   # API deps resolve

git init && git branch -M main
git add .
git status                            # no node_modules, no dist
git commit -m "Full-stack: Azure SQL, Functions API, React front end"
git remote add origin https://github.com/<org>/<repo>.git
git push -u origin main
```

If the remote already has commits: `git pull origin main --allow-unrelated-histories` first.

### Or upload through the website

**Add file → Upload files**, drag the contents of the `repo` folder. Two traps:

- **Hidden files are skipped.** `.gitignore`, `.env.example`, and the whole `.github` folder start with a dot and are hidden by Finder and Explorer. Reveal them (`Cmd+Shift+.` on macOS; View → Show → Hidden items on Windows) and drag them too.
- **To create a folder**, use **Add file → Create new file** and type the path with slashes: `.github/workflows/azure-static-web-apps.yml`. That is the only way through the web UI.

**Check:** browse to `api/shared/db.js` and `sql/01-schema.sql` on GitHub.

---

## 6. Clear the failing workflows

### The Jekyll workflow

GitHub Pages added it. This is a Vite app, not a Jekyll site, so it fails on every push.

1. Delete `.github/workflows/jekyll-gh-pages.yml`.
2. Settings → **Pages** → **Source: None**, or GitHub offers it again.

Nothing here is served from Pages.

### The duplicate Azure workflow

When you connect the Static Web App, Azure commits its own workflow named `azure-static-web-apps-<random-words>.yml`. Two workflows deploying the same site is the second-most common cause of red runs.

```bash
ls .github/workflows/
# azure-static-web-apps.yml                          ← keep
# azure-static-web-apps-polite-meadow-0f3a1b2c.yml   ← delete
git rm .github/workflows/azure-static-web-apps-*meadow*.yml
git commit -m "ci: single deploy workflow" && git push
```

Read Part 7 before deleting — you need the secret name from it.

---

## 7. The deployment token

The most common failure, and it is not a code problem.

Azure creates the deployment token as a repository secret with a **random suffix**:

```
AZURE_STATIC_WEB_APPS_API_TOKEN_POLITE_MEADOW_0F3A1B2C
```

The workflow in this repo references the plain name. That secret doesn't exist, so GitHub substitutes an empty string and the deploy step fails with `deployment_token was not provided.`

1. GitHub → Settings → **Secrets and variables** → **Actions**. Copy the full secret name.
2. Open `.github/workflows/azure-static-web-apps.yml`. Find the **two** lines marked `>>> EDIT <<<` — one in `build_and_deploy`, one in `close_pr`. Missing the second only surfaces days later, when you close a pull request.
3. Replace the name in both, keeping `${{ secrets.` and `}}` intact.
4. Commit.

To rotate later: portal → Static Web App → Overview → **Reset deployment token**, then update the secret. Deleting the commit that leaked it is not a fix — it stays in history and in every clone.

---

## 8. Create the Static Web App

1. Azure portal → **Create a resource** → **Static Web App**
2. Basics:

   | Field | Value |
   |---|---|
   | Resource group | `rg-cls-prod` |
   | Name | `cls-rental-control` |
   | Plan type | **Standard** |
   | Region | same as the database |
   | Source | **GitHub** → your org, repo, branch `main` |

   **Standard, not Free.** A managed Functions API on the Free plan is limited, and Free has no SLA. This is the second of the two paid line items.

3. Build details:

   | Field | Value |
   |---|---|
   | Build preset | **Custom** |
   | App location | `dist` |
   | Api location | `api` |
   | Output location | *(empty)* |

   This looks unusual and is correct: the GitHub workflow runs `npm run build` and `npm ci --prefix api` itself, then hands Azure the finished folders with `skip_app_build` and `skip_api_build` set. Azure's own builder guessing at your framework causes more failures than it prevents.

4. Review + create. Then go back to Part 6 and delete the workflow Azure just committed.

---

## 9. Connect the API to SQL with a managed identity

The API authenticates to the database as itself. **No connection string, no password, nothing to rotate or leak.** This is the step people skip and then regret.

### Turn on the managed identity

Portal → Static Web App → **Settings → Identity** → **System assigned** → **On** → Save. Copy the Object (principal) ID it shows you.

### Grant it access in SQL

Connect to the `cls` database **as the Entra admin** and run:

```sql
-- the name must match the Static Web App resource name exactly
CREATE USER [cls-rental-control] FROM EXTERNAL PROVIDER;

ALTER ROLE db_datareader ADD MEMBER [cls-rental-control];
ALTER ROLE db_datawriter ADD MEMBER [cls-rental-control];

-- the stored procedures do the transactional work
GRANT EXECUTE ON SCHEMA::cls TO [cls-rental-control];
```

Least privilege in practice: the identity can read, write, and execute the procedures. It cannot alter the schema. Migrations are run by a human, deliberately.

### Point the API at the server

Portal → Static Web App → **Settings → Environment variables** → Production, add:

| Name | Value |
|---|---|
| `SQL_SERVER` | `cls-sql-<yourinitials>.database.windows.net` |
| `SQL_DATABASE` | `cls` |

Do **not** set `SQL_USER` or `SQL_PASSWORD` in Azure. Their presence is what makes `shared/db.js` fall back to password authentication; leaving them unset is what selects the managed identity.

Save. The API restarts automatically.

---

## 10. Stage 1 — deploy and verify the API

Deploy with no access control first. Confirm the whole stack talks before adding auth — otherwise a blank page could be the build, the config, the database, the identity, or the login.

The `routes` block in `public/staticwebapp.config.json` is what enforces roles. For this stage, temporarily replace it with:

```json
"routes": [],
```

Commit and push. Watch Actions: checkout → `npm ci` → `npm run build` → verify config → `npm ci --prefix api` → deploy. Three to six minutes.

### Check — in this order

1. **Run is green.**
2. **The API is alive.** Open `https://<your-site>/api/health`. Expect:

   ```json
   { "ok": true, "assets": 106, "at": "2026-08-10T..." }
   ```

   First call after an idle period can take a minute while the database resumes. Refresh once before concluding anything.
3. **The data loads.** Open the site root. You should get the Dashboard with 106 assets and real utilisation numbers — read from SQL, not from a seeded array.
4. **Assets serve correctly.** F12 → Network → hard refresh. Files under `/assets/` must return `Content-Type: text/javascript`, not `text/html`. If they return HTML, the SWA config didn't reach `dist/`.
5. **Writes persist.** Fleet → pencil on any asset → change the yard slot → Save. Hard-refresh the page. The change survives. That is the whole point of this rewrite; verify it explicitly.

**Stop here until all five pass.**

---

## 11. Stage 2 — require sign-in

Restore the routes block, but with `authenticated` while you test:

```json
"routes": [
  { "route": "/api/*", "allowedRoles": ["authenticated"] },
  { "route": "/*", "allowedRoles": ["authenticated"] }
],
"responseOverrides": {
  "401": { "statusCode": 302, "redirect": "/.auth/login/aad" }
}
```

Push, wait for green.

**Check:** in a private window you're redirected to a Microsoft login; after signing in you land on the Dashboard.

Understand what this does: `authenticated` means *signed in with any Microsoft account anywhere*. It stops anonymous traffic and nothing more. Stage 3 is the real control.

Useful endpoints:

| URL | Does |
|---|---|
| `/.auth/login/aad` | Sign in |
| `/.auth/logout` | Sign out |
| `/.auth/me` | Your identity and roles as JSON — fastest way to debug a role problem |

---

## 12. Stage 3 — roles and invitations

### Invite yourself first, and redeem it

If you tighten the config while nobody holds a role, you lock yourself out.

1. Portal → Static Web App → **Role management** → **Invite**
2. Provider **Microsoft**, your email, your site's domain, role **`admin`**, expiry 168 hours.
3. **Generate**, copy the link. **Azure does not send it** — open it yourself, sign in, accept.

**Check:** `/.auth/me` shows `"userRoles": ["anonymous","authenticated","admin"]`.

### Tighten the config

Copy `docs/staticwebapp.config.locked.json` over `public/staticwebapp.config.json`. Push.

That file gates the API by role, not just the site:

| Route | Roles |
|---|---|
| `/api/reports/*` | ops, finance, admin |
| `/api/products/*`, `/api/assets/*`, `/api/stock` | ops, admin |
| `/api/scan/*` | yard, dispatch, ops, admin |
| `/api/quotes/*` | dispatch, ops, finance, admin |
| everything else | any assigned role |

**These are belt; the braces are in the code.** Every endpoint also calls `requireRole()` in `shared/auth.js`, reading the signed principal header. Platform routing and application checks are independent, so a mistake in one doesn't open the door.

**Check:** you still get in; an uninvited account is bounced. Actually test the second half.

### The roles

| Role | Who | Can |
|---|---|---|
| `yard` | Yard crew | Scan in and out. **Cost and book value are stripped server-side**, not hidden in the UI |
| `dispatch` | Dispatchers | Quotes, contracts, jobsites |
| `ops` | Ops manager | Catalog, rates, receiving, all reports |
| `finance` | Accounting | Depreciation runs, QuickBooks posting |
| `customer` | Contractor PMs | Their own jobsites only |
| `admin` | You | Everything |

**On `customer`:** the API scopes those queries to the customer on their `cls.AppUser` row. Until you have created that row, an invited customer sees nothing — which is the correct failure direction. Insert it before inviting them:

```sql
INSERT cls.AppUser (provider, subject_id, email, display_name, role, customer_id)
VALUES ('aad', '<their object id from /.auth/me>', 'pm@contractor.com', 'Tom Whitfield', 'customer', 'C-101');
```

---

## 13. Running locally

Two processes.

```bash
# terminal 1 — the API
cd api
cp local.settings.json.example local.settings.json
# fill in SQL_SERVER, SQL_DATABASE, SQL_USER, SQL_PASSWORD
# AUTH_DISABLED=true makes every local request an admin
npm install
func start                    # http://localhost:7071

# terminal 2 — the front end
npm install
npm run dev                   # http://localhost:5173
```

`.env` should contain `VITE_API_BASE=http://localhost:7071/api`.

For local access you need a SQL login, since your laptop has no managed identity. Either add your Entra account as an admin on the server and use interactive auth, or create a contained user:

```sql
CREATE USER cls_app WITH PASSWORD = '<strong password>';
ALTER ROLE db_datareader ADD MEMBER cls_app;
ALTER ROLE db_datawriter ADD MEMBER cls_app;
GRANT EXECUTE ON SCHEMA::cls TO cls_app;
```

`local.settings.json` is gitignored. Keep it that way.

**Point local dev at a copy, not production.** Azure portal → your database → **Restore** or **Copy** → `cls-dev`. Serverless with auto-pause means an idle dev copy costs very little.

---

## 14. Operations

### Budget alert — do this today

Azure has **no hard spend cap**. Portal → **Cost Management + Billing** → **Budgets** → Add. Scope `rg-cls-prod`, amount **$100**, alerts at 80% and 100%, your email. You expect $30–75; hearing about $100 within hours is the point.

### Nightly quote expiry

Sent quotes hold inventory. Without expiry, availability becomes fiction within a quarter as dead quotes accumulate phantom commitments.

Portal → Static Web App → the API supports `POST /api/maintenance/expire-quotes`. Schedule it with an Azure Logic App (Recurrence → HTTP POST, daily at 02:00), or add a timer-triggered function to `api/` when you next touch it.

### Monthly depreciation

`POST /api/reports/depreciation/2026-08` computes the run and stores it. It refuses to run the same period twice. Post the resulting journal entry to QuickBooks — QBO does not compute depreciation itself.

### Backups

Azure SQL takes automatic backups with 7-day point-in-time restore by default. Raise it under **Backups → Retention policies** if you want longer. Nothing to build.

### Branch protection

Settings → Branches → protect `main`: require a pull request, require the **Build and deploy** check. Every PR gets a preview URL with its own API — but note it points at the **same database**. For anything schema-touching, point the preview at `cls-dev` first.

### Application Insights

Portal → Static Web App → Application Insights → Enable. Free for 5 GB/month, and history is not retroactive.

---

## 15. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `deployment_token was not provided` | Secret name mismatch | Part 7 |
| Two deploy runs per push | Second workflow file survives | `ls .github/workflows/` — exactly one |
| `/api/health` returns 500 | API can't reach SQL | Check `SQL_SERVER`/`SQL_DATABASE`; confirm the SQL user was created FROM EXTERNAL PROVIDER; confirm "Allow Azure services" is on |
| First load takes 60s, then works | Serverless auto-resume | Expected. Lower auto-pause delay only if it genuinely bothers people — it costs money |
| App shows "database may be waking up" | Same | Press retry |
| `Login failed for user '<token-identified principal>'` | Managed identity has no SQL user | Run the `CREATE USER ... FROM EXTERNAL PROVIDER` block in Part 9 |
| Blank page, console MIME-type error on a module script | SWA config missing from `dist/` | It must live in `public/`; the workflow's verify step catches this |
| 404 refreshing on `/quotes` | Same cause | Same |
| Signed in but 403 from the API | Role missing | `/.auth/me`, then re-invite via Role management |
| `Customer is on credit hold` on send | Working as designed | Finance or admin clears it, or fix the account |
| `Discount reaches N%, over the limit` | Server-side approval gate | An `ops` or `admin` role sends it |
| Writes appear then vanish on refresh | A save failed and the reload showed the truth | Look at the toast; check the browser Network tab for the failing call |
| `npm ci` fails in the run | Lock file out of sync | `npm install` locally, commit the lock file |

**Reading a failed run:** Actions → the run → the failed job → expand the red step. The real error is usually the last 20 lines.

**Reading an API error:** portal → Static Web App → **Functions** → the function → Invocations, or query Application Insights.

---

## 16. Rolling back

**Code** rolls back through git; the workflow redeploys in minutes.

```bash
git revert HEAD && git push
```

**Data** does not roll back with it. That is the substantive change from the prototype: a bad deploy used to lose nothing because nothing persisted. Now a bad migration can corrupt real records.

So, for anything touching the schema:

1. Take a manual copy first: portal → database → **Copy** → `cls-prerelease-2026-08-10`.
2. Deploy.
3. If it goes wrong, point `SQL_DATABASE` at the copy while you fix forward.

Point-in-time restore is the safety net underneath that — portal → database → **Restore** → pick a timestamp. It creates a new database rather than overwriting, so you always have both.

**Never** run a destructive migration against production without a copy taken in the preceding minutes. The seed script is safe to re-run (`MERGE`), but your own future migrations will not all be.
