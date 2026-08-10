# Contractor Leasing Solutions — rental asset control

Inventory, quoting, and dispatch for a Florida temp equipment, furnishings, and technology rental operation serving general contractors.

Tracks serialized assets and pooled stock, prices and holds quotes against real availability, moves equipment in and out of the yard by QR scan, depreciates the fleet, and pushes the result to QuickBooks Online.

---

## Status: full stack, running on Azure SQL

Data lives in a database. The React front end talks to an Azure Functions API, which talks to Azure SQL. Refreshing the page no longer resets anything — that was the prototype.

| Real | Still to build |
|---|---|
| Azure SQL persistence, all reads and writes | QuickBooks sync — mapping is right, nothing posts yet |
| Availability computed in SQL over a date window | QR codes — the plates are placeholder patterns, not scannable |
| Check-out and check-in as transactional stored procedures | Documents print via the browser dialog, not rendered and stored |
| Role enforcement in the API, cost stripped server-side | Delivery routing, work orders, e-signature |
| Rate laddering, price waterfall, approval and credit gates | Partial returns of pooled quantities |
| Straight-line depreciation with a stored monthly run | |

The seeded catalog is illustrative. **Replace `cls.Product`, `cls.ProductUom`, and `cls.Customer` with your real SKUs, rates, and contractors before anyone quotes from it** — `sql/03-seed.sql` uses `MERGE`, so you can edit that file and re-run it.

---

## Quick start

Two processes, because there are now two halves.

```bash
# API
cd api && cp local.settings.json.example local.settings.json
# fill in SQL_SERVER / SQL_DATABASE / SQL_USER / SQL_PASSWORD
npm install && func start        # http://localhost:7071

# front end (new terminal)
npm install && npm run dev       # http://localhost:5173
```

Node 20+, Azure Functions Core Tools v4, and a database with `sql/01-schema.sql`, `sql/02-availability.sql`, and `sql/03-seed.sql` applied. Full walkthrough in [`docs/DEPLOY.md`](docs/DEPLOY.md).

---

## Layout

```
├── index.html                  Vite entry
├── sql/
│   ├── 01-schema.sql           Tables, constraints, indexes
│   ├── 02-availability.sql     Availability function + transactional procedures
│   └── 03-seed.sql             Config, catalog, directory, fleet
├── api/                        Azure Functions — the only thing that touches SQL
│   ├── src/functions/          bootstrap, availability, assets, quotes, scan, reports
│   ├── shared/db.js            pool, transactions, managed-identity auth
│   └── shared/auth.js          role enforcement
├── src/
│   ├── main.jsx                Mounts the app
│   ├── api.js                  Fetch client
│   ├── store.js                Bootstrap load, mutations, availability hook
│   └── App.jsx                 Views (see note below)
├── docs/
│   ├── DEPLOY.md               Step-by-step deployment and troubleshooting
│   ├── build-guide.md          Architecture, data model, CPQ logic, QBO integration
│   └── staticwebapp.config.locked.json   Stage 3 config: role-gated routes
├── public/
│   └── staticwebapp.config.json   Routing, MIME types, role gating (must live here —
│                                   Vite copies public/ into dist/, which is what deploys)
├── .github/workflows/          Build and deploy
└── .env.example                Copy to .env locally; .env is gitignored
```

**`src/App.jsx` is one large file on purpose — for now.** It started as a single-file prototype so the whole thing could be read top to bottom. That stops being a virtue the moment two people work on it. Split it before the second contributor arrives, along the seams already marked by the `/* ---- SECTION ---- */` comments:

```
src/
├── domain/        ladder, availableFor, priceLine, quoteTotals, depreciate
├── data/          CATALOG, CUSTOMERS, SITES, seed fleet   → replaced by the API in Phase 2
├── components/    Plate, QRArt, Field, modals
├── views/         Dashboard, ScanBay, Fleet, Quotes, Contractors, OnRent, Reports, QBO, Access
├── docs/          QuoteDoc, PackingDoc, TagSheet
└── styles.js      the CSS block
```

Pull `domain/` out first. It is pure functions with no React in it, it holds the logic worth testing, and it is what the API will need to share.

---

## Domain decisions worth knowing before you change anything

These are the choices that would be expensive to reverse. Full reasoning is in [`docs/build-guide.md`](docs/build-guide.md).

- **Availability is a window query, and it is answered by SQL.** `cls.fnAvailability(sku, start, end, excludeQuote)` subtracts rentals, service holds, and live quote holds that *overlap* the requested dates. The quote desk asks the server on every change rather than reading a page-load snapshot, because that snapshot goes stale the moment another desk quotes the same lifts.
- **The database is the authority on what may happen.** Credit holds, the discount ceiling, and load completeness are enforced in the API and in stored procedures. The UI disables buttons as a courtesy; the server is what refuses.
- **Cost never leaves the server for roles that shouldn't see it.** `yard` and `customer` bootstrap payloads omit acquisition cost and book value entirely. Hiding a column in the UI is not access control.
- **Serialized vs pooled is a per-SKU decision.** Serialize anything with a serial number, a meter, or a replacement cost over roughly $500. Everything else is a counted pool where you tag the bundle. Nobody scans 240 fence panels.
- **Quotes hold the pool; dispatch binds the serial.** A sent quote soft-holds quantity and releases itself at expiry. Specific tags are assigned on the load sheet the morning of delivery.
- **Check-out is order-driven, check-in is project-driven.** The loader works from an order; the driver returning from a site has a jobsite in front of him, and his truck may hold units from several orders or none. Loads must be complete to dispatch; returns may be partial.
- **Rental time starts and stops at the gate**, not when the superintendent calls it off rent. Confirm this matches how you bill before it reaches a customer.
- **The model owns what's true of every unit; the asset owns what's true of one purchase.** Name, description, rate card, and unit ladder propagate. Acquisition cost, in-service date, and meter never do.
- **Depreciation here is book basis only.** Tax depreciation is a separate schedule and belongs with your CPA.
- **Tax rates in the code are placeholders for quoting.** QuickBooks computes what actually invoices, from the jobsite address.

---

## Deploying

Target is Azure Static Web Apps. **Full runbook in [`docs/DEPLOY.md`](docs/DEPLOY.md)** — read it before pushing, there are two traps that fail silently.

Short version: create the database and run the three scripts in `sql/`, create a **Standard** Static Web App, turn on its managed identity and grant it access in SQL, paste your Azure token secret's real name into the workflow, then deploy in three stages — stack up, sign-in required, role-gated.

Preview environments share the production database. For anything schema-touching, point the preview at a copy first.

Costs run about $30–75/month for one yard, dominated by the serverless database. Itemised in [`docs/DEPLOY.md`](docs/DEPLOY.md) §2.

---

## Secrets

Nothing secret goes in this repo. Ever.

- **Local:** copy `.env.example` to `.env`. It is gitignored.
- **CI:** GitHub → Settings → Secrets and variables → Actions.
- **Runtime:** Azure app settings, backed by Key Vault once real invoices are flowing.

One Vite-specific trap: **anything prefixed `VITE_` is inlined into the browser bundle and is public.** The QuickBooks client secret, the SQL connection string, and the QBO refresh token must never carry that prefix and must never be read from front-end code. They belong to the API.

If a secret does get committed, rotating it is the fix — deleting the commit is not, because it stays in the history and in every clone.

---

## Working in this repo

Make it private. It will hold customer names, rate cards, and eventually credentials.

- `main` is deployable. Protect it: require a PR, require the build to pass, no direct pushes.
- Short-lived branches: `feat/quote-approvals`, `fix/bulk-availability`.
- Preview URLs make review concrete — reviewers should click, not just read the diff.
- Tag releases as you put them in front of the yard crew (`v0.2-yard-pilot`), so "what were we running the week the numbers looked wrong" has an answer.

The bundle is currently ~716 kB (~199 kB gzipped), most of it Recharts. Fine for now; code-split the reporting views when it starts to matter.

---

## Where this is going

**Phase 1 — the spine.** ✅ Contractors and jobsites, assets and receiving, scan check-in/out, dashboard, roles. Run it in the yard for two weeks before writing anything else. Whether the crew will actually scan things is the only question worth answering first.

**Phase 2 — money.** ✅ Persistence and the availability query. Remaining: billing periods, invoice generation, QuickBooks sync.

**Phase 3 — the rest.** Reporting, work orders and maintenance, the contractor portal, overdue notifications.

**Phase 4 — polish.** Reservation calendar, delivery routing, meter-based billing, damage photos at check-in.

---

## License

Private and proprietary. Not for distribution.
