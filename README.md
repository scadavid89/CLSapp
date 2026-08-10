# Contractor Leasing Solutions — rental asset control

Inventory, quoting, and dispatch for a Florida temp equipment, furnishings, and technology rental operation serving general contractors.

Tracks serialized assets and pooled stock, prices and holds quotes against real availability, moves equipment in and out of the yard by QR scan, depreciates the fleet, and pushes the result to QuickBooks Online.

---

## Status: working prototype

**This is a front end running on seeded in-memory data.** Every screen works and the business logic is real — availability, rate laddering, the price waterfall, depreciation — but there is no database, no API, and no authentication yet. Refreshing the page resets everything.

What that means in practice:

| Real | Simulated |
|---|---|
| Availability as a date-range query, with next-free dates | All data (~90 assets, 5 pools, 6 contractors, 5 quotes) |
| Rate laddering across day / 7-day week / 28-day month | QuickBooks sync — the mapping is right, nothing posts |
| Price waterfall, approval thresholds, rate floor | Sign-in and roles — the model is designed, not enforced |
| Straight-line depreciation, book value, ROI per unit | QR codes — the plates are placeholder patterns, not scannable |
| Scan-driven check-out and check-in with packing lists | Documents print via the browser dialog, not rendered server-side |

Point it at your real SKUs and rates before drawing conclusions. Replace the `CATALOG` array in `src/App.jsx` and the dashboards become meaningful immediately — that is the fastest way to find out whether the model matches how you actually rent.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production bundle into dist/
npm run preview      # serve the built bundle locally
```

Node 20 or newer.

---

## Layout

```
├── index.html                  Vite entry
├── src/
│   ├── main.jsx                Mounts the app
│   └── App.jsx                 The whole application (see note below)
├── docs/
│   ├── DEPLOY.md               Step-by-step deployment and troubleshooting
│   ├── build-guide.md          Architecture, data model, CPQ logic, QBO integration
│   ├── free-tier-hosting.md    Running this on free Azure, and where free breaks
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

- **Availability is a window query, not a stock count.** `availableFor(sku, start, end)` subtracts rentals, service holds, and live quote holds that *overlap* the requested dates. A count of what's on the shelf today answers the wrong question and will promise units it can't deliver.
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

Short version: keep exactly one deploy workflow, paste your Azure token secret's real name (it has a random suffix) into `.github/workflows/azure-static-web-apps.yml`, and deploy in three stages — site up, then sign-in required, then role-gated. Every pull request gets its own preview URL, which closes with the PR.

Cost, free-tier limits, and the one place free genuinely breaks (the Azure SQL vCore-second budget) are in [`docs/free-tier-hosting.md`](docs/free-tier-hosting.md).

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

**Phase 1 — the spine.** Sign-in, contractors and jobsites, assets and receiving, QR labels, scan check-in/out, dashboard. Run it in the yard for two weeks before writing anything else. Whether the crew will actually scan things is the only question worth answering first, and it is the one this phase answers.

**Phase 2 — money.** Persistence, the availability query in SQL, quoting, contracts, billing periods, depreciation posting, QuickBooks sync.

**Phase 3 — the rest.** Reporting, work orders and maintenance, the contractor portal, overdue notifications.

**Phase 4 — polish.** Reservation calendar, delivery routing, meter-based billing, damage photos at check-in.

---

## License

Private and proprietary. Not for distribution.
