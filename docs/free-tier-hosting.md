# Contractor Leasing Solutions on free Azure

A companion to the build guide. Same app, zero-dollar footprint. With access now granted by invitation rather than by directory membership, only one real constraint is left — and it's the database, not the login.

---

## The stack

| Layer | Free service | What you actually get |
|---|---|---|
| Front end | Azure Static Web Apps, **Free plan** | Global CDN, free managed TLS, 2 custom domains, 3 staging environments, 100 GB bandwidth/mo, 250 MB per environment. Lifetime, not a trial. |
| API | Azure Functions, Consumption | 1M executions and 400,000 GB-seconds per month, free forever. SWA can host these as a managed API or you can bring your own Function App. |
| Database | Azure SQL Database **free offer** | 100,000 vCore-seconds, 32 GB data, 32 GB backup — per database, per month, refreshed monthly, for the lifetime of the subscription. Up to 10 databases per subscription. |
| Identity | Built-in Static Web Apps providers | Microsoft and GitHub sign-in, invitation-based custom roles, no app registration and no client secret to rotate. Free plan, no add-on. |
| Monitoring | Application Insights | 5 GB ingestion per month free. |
| CI/CD | GitHub Actions | SWA wires up the workflow for you on create. |

The React prototype builds to static files and drops straight onto Static Web Apps. The API becomes Functions. Nothing about the app design changes.

Two housekeeping items before you deploy anything: **Azure has no hard spend cap**, so set a budget alert at $5 on day one. And on the free SQL database, choose **"Auto-pause the database until next month"** rather than "continue for additional charges" — that turns a surprise bill into a surprise outage, which is the failure mode you want while piloting.

---

## Identity: this is where free now wins

Dropping the domain restriction removes the one thing that was going to cost money.

Static Web Apps Free includes built-in sign-in providers — Microsoft, GitHub — at `/.auth/login/aad` and `/.auth/login/github`. The built-in Microsoft provider uses Microsoft's shared multi-tenant registration, so any Microsoft account authenticates successfully. When you needed domain-only that was the flaw; now it's exactly the behavior you want, and the $9/month Standard plan that bought single-tenant enforcement is no longer needed.

**Gate on a custom role, not on `authenticated`.** `authenticated` means "signed in with any account anywhere," which is not an access decision. Invite each person in the Static Web App's Role management pane, assign a role, and route on that:

```json
{
  "navigationFallback": { "rewrite": "/index.html" },
  "routes": [
    { "route": "/api/*", "allowedRoles": ["yard", "dispatch", "ops", "finance", "admin", "customer"] },
    { "route": "/*",     "allowedRoles": ["yard", "dispatch", "ops", "finance", "admin", "customer"] }
  ],
  "responseOverrides": {
    "401": { "statusCode": 302, "redirect": "/login" }
  }
}
```

Send people to your own `/login` page rather than straight to one provider, since they no longer all use the same kind of account.

**Then check again in the API, against your own user table.** Platform roles get you routing; the AppUser row is what carries `customer_id` scoping and the disable switch. Every function starts here:

```js
// shared/auth.js
export async function requireUser(req, db) {
  const header = req.headers["x-ms-client-principal"];
  if (!header) throw { status: 401, msg: "Sign in to continue" };
  const p = JSON.parse(Buffer.from(header, "base64").toString("utf8"));

  const user = await db.appUser.findBySubject(p.identityProvider, p.userId);
  if (!user)            throw { status: 403, msg: "This account has not been invited" };
  if (user.disabled_at) throw { status: 403, msg: "This account has been disabled" };

  await db.appUser.touch(user.user_id);           // drives the idle-account report
  return user;                                     // role, customer_id, provider
}

// customer-scoped reads never take a customer id from the client
export function scopeFor(user, where = {}) {
  return user.role === "customer" ? { ...where, customer_id: user.customer_id } : where;
}
```

Two checks, because they do different jobs: the platform stops strangers at the door, and the API decides what a known person is allowed to see. The invite pane alone can't express "this GC contact sees only Water Street Tower 3."

**Static Web Apps invitations are manual, single-use links.** Fine at twenty users, tedious at sixty. When it gets tedious, that's the signal to move invitations into the app itself — your own Invitation table, your own emails, the platform still handling the actual sign-in. Design the AppUser table for that from day one and the migration is a background job, not a rewrite.

**Entra ID Free still matters for your own staff**, just not as a wall. Company accounts get SSO and whatever MFA your tenant already enforces, which is why `Admin` and `Finance` should be restricted to them by policy. Note that assigning security groups to app roles requires Entra ID P1 or P2, and Conditional Access needs P1 — neither is relevant now that roles live in your user table, which is a genuine simplification rather than a workaround.

---

## The one real constraint: the free SQL budget is smaller than a work week

100,000 vCore-seconds sounds generous. Do the arithmetic against a yard:

- Serverless minimum is **0.5 vCore**, and the minimum auto-pause delay is **1 hour** of inactivity.
- A crew scanning from 6am to 5pm never leaves a full idle hour, so the database stays awake roughly **11 hours a day**.
- 0.5 vCore × 11 h × 3,600 s ≈ **19,800 vCore-seconds per day**.

The monthly allowance is gone in **about five working days**. After that the database auto-pauses until the first of the next month and the app is simply down.

What genuinely helps:

- Cache the product catalog, rate cards, and UOM ladders in the Functions layer or in SWA's static payload. They change weekly, not hourly, and they're most of the read traffic.
- Batch movement writes rather than one round trip per scan.
- Keep every connection pooled and closed; an open SSMS window overnight will burn the month's budget by itself. This is the single most common way people lose the free grant.

What doesn't help: none of the above buys you a full month of daily yard use. It buys you maybe two weeks.

So the realistic choices are:

| Option | Cost | Trade-off |
|---|---|---|
| Free SQL, accept the cap | $0 | Fine for a pilot, evenings-and-weekends testing, or a single yard used a few hours a day. Not fine as production. |
| Cosmos DB free tier | $0 | 1,000 RU/s + 25 GB, lifetime, no pause behavior — it will carry a small yard's traffic all day, every day. But you rewrite the relational model as documents, and the depreciation register, utilization joins, and reporting queries all get meaningfully harder. Trading a working data model for $15/month is a bad trade for this business. |
| SQL serverless, paid past the free grant | ~$5–15/mo | Keep the model, keep auto-pause, pay for the vCore-seconds you actually use. |

---

## What else free costs you

- **No SLA** on Static Web Apps Free or on the free SQL grant. Microsoft says outright it's for development and proof-of-concept.
- **No private networking.** SWA Free has no private endpoints, and you can't put the free SQL database behind a Private Endpoint on this stack. You're relying on firewall rules and session validation in the API.
- **Blob storage free tier is 12 months only** — but this one doesn't matter. 5 GB of hot LRS runs about a dime a month afterward. Damage photos and signed delivery tickets are not what makes this expensive.
- **Key Vault isn't free**, though it's fractions of a cent. On the free build, put the QBO client secret in SWA environment variables (encrypted at rest, RBAC-gated) and move it to Key Vault once real invoices are flowing.
- **Invitations are manual.** No bulk import, no directory sync. Twenty users is comfortable, sixty is not — see the note above on moving invitations into the app.
- **250 MB per SWA environment.** The prototype bundle is well under this. Watch it if you start embedding fonts and images.

---

## Recommended shape

**Phase 1, genuinely $0.** Static Web Apps Free + Functions + free SQL. Invite four or five people, run one yard, and prove the scan workflow survives contact with your crew. That's the only question worth answering at this stage, and free answers it completely.

**Go-live.** Static Web Apps **Free** + SQL serverless with auto-pause (~$5–15) + Blob (~$1) + Application Insights (free tier holds) = **roughly $6–16 per month**, all in, for a single yard. The hosting and identity layers stay free permanently; the database is the only line item that grows with use.

You'd move to Standard ($9) later for a reason other than login — more custom domains, more staging environments, larger bundles, or an SLA.

Which is the number worth sitting with: **well under $200 a year**, against Quipli's list price of <cite index="4-1">$6,000 per rental location per year</cite>. You're trading a mature product with an e-commerce storefront, delivery dispatch, and a support team for something you own and can shape around how you actually rent. Whether that trade is right depends on how much of your rental volume comes in over the phone versus over the web — but the hosting cost is not the deciding factor in either direction.
