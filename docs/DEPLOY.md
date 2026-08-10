# Deploying

Fixing the two red workflow runs, then getting the site up and locked down in that order.

---

## The two failing runs

### 1. "Add GitHub Action workflow for Jekyll site CI"

GitHub Pages added this. Somewhere in Settings → Pages, Pages got switched on, and GitHub offered its Jekyll workflow. It fails because this is a Vite React app with no Jekyll site in it — there is nothing for it to build.

Nothing here is hosted on Pages. Azure hosts it. So remove both:

```bash
git rm .github/workflows/jekyll-gh-pages.yml
git commit -m "ci: remove Jekyll workflow, this is a Vite app on Azure"
git push
```

Then Settings → Pages → **Source: None**, or it will offer to add the file again.

### 2. "ci: add azure static web apps workflow file"

When you created the Static Web App and pointed it at this repo, Azure committed its own workflow — `azure-static-web-apps-<random-name>.yml`. You now have two workflows racing to deploy the same site.

Worse, they don't use the same secret. **Azure creates its deployment token with a random suffix**, something like `AZURE_STATIC_WEB_APPS_API_TOKEN_POLITE_MEADOW_0F3A1B2C`. The workflow I originally gave you references the plain name `AZURE_STATIC_WEB_APPS_API_TOKEN`, which doesn't exist in your repo — so that run fails with an empty deployment token, and Azure's own run may fail separately on build configuration.

Keep exactly one. Do this:

1. Settings → Secrets and variables → Actions. **Copy the exact secret name Azure created.**
2. Open `.github/workflows/azure-static-web-apps.yml` and paste that name into the two spots marked `>>> EDIT <<<`.
3. Delete Azure's generated file:

```bash
git rm .github/workflows/azure-static-web-apps-*.yml   # the random-suffix one
git add .github/workflows/azure-static-web-apps.yml
git commit -m "ci: single deploy workflow, correct token secret"
git push
```

If you'd rather not edit the file, the alternative is to add a **second** secret named exactly `AZURE_STATIC_WEB_APPS_API_TOKEN` holding the same value. Either works. Editing the file is cleaner — one secret, one workflow, no drift.

---

## The bug that was mine

The original scaffold put `staticwebapp.config.json` at the repo root. That is wrong for a build-output deployment.

Static Web Apps reads that file from **the folder that gets uploaded**, which is `dist/`. At the repo root, with `skip_app_build: true`, it never gets copied — so it is silently ignored. Nothing errors. You just get a site with no routing rules and no auth, which is the worst possible failure mode because it looks like it worked.

The fix, already applied: the file now lives in `public/`, and Vite copies everything in `public/` into `dist/` at build time. Verified locally — `dist/staticwebapp.config.json` is present after `npm run build`.

The workflow now also has a step that fails the run loudly if that file goes missing from `dist/`, so this can't come back quietly.

Two related things the config now handles:

- **`navigationFallback.exclude` covers `/assets/*` and `/*.js`.** Without it, the catch-all route returns `index.html` for your JavaScript bundles, the browser refuses them for the wrong MIME type, and you get a blank page with a console error about module scripts. It's the single most common Vite-on-SWA failure.
- **`mimeTypes`** are declared explicitly for the same reason.

---

## Deploy in three stages

Do not do these at once. If you turn on routing and auth in the same push that first deploys the app, a white screen could be any of four things.

### Stage 1 — get the site up, no auth

Current state of `public/staticwebapp.config.json`. Push to `main`, watch the run go green, open the URL Azure gives you.

You should see the dashboard with seeded data. Open DevTools → Network and confirm the files under `/assets/` come back as `text/javascript`, not `text/html`. If they're `text/html`, the config didn't ship — check the verify step in the run log.

**Stop here until this works.** Everything else builds on it.

### Stage 2 — require sign-in

Add this to `public/staticwebapp.config.json`, above `globalHeaders`:

```json
"routes": [
  { "route": "/*", "allowedRoles": ["authenticated"] }
],
"responseOverrides": {
  "401": { "statusCode": 302, "redirect": "/.auth/login/aad" }
},
```

Push. Now an anonymous visitor is bounced to a Microsoft login. Confirm you can sign in and land on the dashboard.

Understand exactly what this does and doesn't do: `authenticated` means **signed in with any Microsoft account anywhere**. It keeps out drive-by anonymous traffic and nothing else. That's fine as a checkpoint. It is not the finished state.

### Stage 3 — invite people and gate on roles

In the Azure portal, open the Static Web App → **Role management** → Invite. Enter an email, set roles (`admin` for yourself), pick an expiry, generate the link, send it. The person opens the link, signs in, and the role sticks to that identity.

**Invite yourself first and redeem it**, before you tighten the config. If you switch to named roles while nobody holds one, you lock yourself out of your own site — recoverable through the portal, but an avoidable ten minutes.

Once you hold `admin`, copy `docs/staticwebapp.config.locked.json` over `public/staticwebapp.config.json` and push. Routes now require one of `yard`, `dispatch`, `ops`, `finance`, `admin`, `customer`. Signed in without a role gets a 403 redirect back to login.

Invitations are manual and one at a time. Comfortable at twenty users, tedious at sixty — see `build-guide.md` §2 for when to move invitations into the app.

---

## What supporting infrastructure you need right now

**None.** That is the useful answer.

The app is currently a front end with seeded in-memory data. It makes no API calls, opens no database connections, and holds no secrets. Provisioning SQL, Key Vault, Blob Storage, and a Functions app today would give you four resources to configure, secure, and pay for while nothing uses them — and the free Azure SQL grant starts burning its monthly vCore-second budget the moment the database wakes, whether or not anyone queries it.

Stand each one up when the code that needs it exists:

| Resource | Provision when | Notes |
|---|---|---|
| Static Web App | **Now** | Free plan is genuinely sufficient |
| Application Insights | **Now** | Free 5 GB/month, and you want the history from day one |
| Azure SQL | Phase 2, first persistence PR | Free grant, auto-pause, budget alert first |
| Functions API | Phase 2 | Uncomment `api_location: "api"` in the workflow |
| Key Vault | When the QBO secret is real | SWA environment variables until then |
| Blob Storage | When you store damage photos and signed tickets | Pennies, not a decision |

Two things to do today regardless: set an **Azure budget alert at $5**, because Azure has no hard spend cap, and turn on **branch protection** for `main` requiring the build to pass.

---

## When a run goes red

- **"deployment_token was not provided"** — the secret name in the workflow doesn't match the one in repo settings. This is the number one cause.
- **Blank page, console complains about MIME type for a module script** — `staticwebapp.config.json` didn't reach `dist/`, or its `navigationFallback.exclude` doesn't cover `/assets/*`.
- **Two runs on every push** — a second workflow file is still present. `ls .github/workflows/`.
- **`npm ci` fails** — `package-lock.json` is out of sync with `package.json`. Run `npm install` locally and commit the updated lock file.
- **Build passes, site shows an old version** — you're looking at a PR preview URL, not the production one. They're different hostnames.
