# Contractor Leasing Solutions — build guide

Rental asset control for a Florida temp equipment, furnishings, and technology rental operation serving general contractors. This document covers hosting, identity, data model, QR tagging, and the QuickBooks Online integration. The prototype (`cls-rental-control.jsx`) is the UI half; this is the half that makes it real.

---

## 1. Azure footprint

Deliberately small. Everything below is PaaS, so there are no VMs to patch.

| Piece | Service | Tier to start | Notes |
|---|---|---|---|
| Web app + API | Azure App Service (Linux) | B1 (~$13/mo) or P0v3 if you want autoscale | Single container running the API and serving the built React bundle |
| Database | Azure SQL Database | Serverless General Purpose, 0.5–2 vCore, auto-pause | Auto-pause drops idle cost to storage only; wakes in ~1 min |
| Photos, signed tickets, PDFs | Azure Blob Storage | Hot, LRS | Damage photos, delivery tickets, signed contracts |
| Secrets | Azure Key Vault | Standard | QBO client secret, refresh token, SQL connection string |
| Background jobs | Azure Functions (Consumption) | — | Nightly depreciation post, QBO sync retry, overdue notices |
| Logs & alerts | Application Insights + Log Analytics | Pay-as-you-go, 30-day retention | Failed syncs and auth errors go to an email action group |

Realistic monthly run cost for a single yard: **$70–150**. The database dominates once it stops auto-pausing.

Deploy with Bicep or Terraform into one resource group per environment (`rg-cls-prod`, `rg-cls-dev`). Give App Service a **system-assigned managed identity** and grant it:
- `Key Vault Secrets User` on the vault
- `Storage Blob Data Contributor` on the storage account
- `db_datareader` / `db_datawriter` on Azure SQL via Entra authentication

No connection strings or passwords in app settings. Nothing in source control.

### Network posture

Two options:

1. **Simple (recommended to start):** public endpoint, a valid session required for every request, and authorization enforced in the API. Works from any jobsite, any device, any carrier — which matters, because invited users are no longer all on your network.
2. **Locked down:** Private Endpoint on the app plus Azure Front Door with WAF, or App Service integrated into a VNet with Private Link to SQL. Choose this only if you have a compliance reason — it complicates access from the field, which is where this app actually gets used.

Either way, put **Private Endpoint on Azure SQL** and turn off public network access to the database. The app reaches it through VNet integration.

---

## 2. Identity — invite-based access

Access is by invitation, not by directory membership. Anyone can sign in with an identity they already have — a Microsoft work account, a personal Microsoft account, Google, GitHub — and what they can see is decided by the invitation you sent them, not by which company owns their email address.

The mechanism:

1. Sign-in is handled by the hosting platform's built-in providers. No app registration to maintain, no client secret to rotate.
2. Every signed-in person is matched against an **AppUser** table on their stable provider ID. No row, no access — the API returns 403 and the app renders an empty shell.
3. `AppUser.role` carries `Yard`, `Dispatch`, `Ops`, `Finance`, `Admin`, or `Customer`. `Customer` rows also carry a `customer_id`, and every query for that role is filtered to it server-side.
4. Authorize on the server, on every call. The front end hides buttons; the API is what actually enforces.

```
AppUser     user_id, provider, provider_subject_id, email, display_name,
            role, customer_id, invited_by, invited_at, activated_at,
            last_seen_at, disabled_at
Invitation  token, email, role, customer_id, created_by, expires_at, redeemed_at
```

Invitations are single-use, expire in 7 days, and bind to the email they were sent to. First sign-in claims the invitation and writes the provider subject ID onto the AppUser row; from then on, that identity is the key.

### What this buys you

Onboarding takes a minute and no license. A GC's project manager, a seasonal driver, a 1099 dispatcher, or an accountant at an outside firm all get access the same way. Scoping a GC contact to `Customer` + their own `customer_id` means they see their jobsites and due dates and nothing else — no cost, no book value, no other contractors.

### What it costs you, and how to cover it

**Offboarding is now yours.** When someone leaves, disabling their company account no longer removes their access to CLS — they may not have signed in with a company account at all. This is the single real consequence of dropping the directory restriction, and it is the one that bites businesses months later.

Build the cover into the app rather than into a policy document nobody reads:

- **Disable, never delete.** `disabled_at` on AppUser. Their movement history stays intact and attributable.
- **Access screen sorted by `last_seen_at` descending**, so dormant accounts float to the bottom where an admin will notice them.
- **Quarterly access review**, enforced by the app: after 90 days, the Admin role sees a banner listing every active user and cannot dismiss it until each one is confirmed or disabled.
- **Auto-disable after 60 days idle**, with a one-click reactivate. Seasonal crews will hit this; that's the point.
- **Offboarding checklist item** in whatever process HR already runs. The app can email a weekly digest of who has access to make this concrete.

**MFA is the provider's problem now.** You can't require MFA on someone's personal Microsoft account. Cover the gap where it matters instead of pretending you can close it everywhere:

- Short sessions for `Finance` and `Admin` — 8 hours, not 30 days.
- Step-up re-authentication before posting to QuickBooks, changing a rate card, or writing off an asset.
- Restrict `Admin` and `Finance` to company accounts as a matter of policy, and record which provider each user signed in with so you can audit it.
- Every sign-in, role change, and invitation writes to the audit log with the provider and IP.

**The blast radius is smaller than it looks.** Yard and Customer roles — which will be most of your users — cannot see acquisition cost, book value, or margin, and cannot post anything financial. The roles that can are a handful of people you can hold to a higher standard.

---

## 3. Data model

The parts that matter for this business. Everything below is Azure SQL.

### Catalog and stock

```
Product          sku, name, description, category, serialized (bit), has_meter,
                 acquisition_default, useful_life_months, salvage_default,
                 depreciation_method, active
UomLevel         product_id, level, name, base_qty     -- Panel=1, Bundle=12, Truckload=240
RateCard         product_id, term (DAY|WEEK|MONTH28|HOUR), rate, min_charge,
                 effective_from, effective_to, customer_id (null = list price)
Asset            asset_id, tag, product_id, serial, acquisition_cost, in_service_date,
                 useful_life_months, salvage_value, status, condition, yard_bin,
                 meter_hours, disposed_date, disposal_proceeds
StockPool        product_id, location_id, qty_on_hand, qty_on_rent, qty_service
                 -- non-serialized items; always in BASE units
```

Two fields on Jobsite earn their place: `county` drives the discretionary surtax on every invoice, and `delivery_zone_fee` drives freight. Neither belongs on the Customer — a Tampa GC building in Orange County pays Orange County's rate and a longer haul. `active` is what takes a finished site out of the quote picker without deleting its history.

Two rules that keep this from getting messy later:

- **Stock always moves in base units.** Quote a truckload of fence, decrement 240 panels. The UOM ladder is a presentation and pricing layer, never a storage layer.
- **The model owns what's true of every unit; the asset owns what's true of one purchase.** Name, description, category, rate card, and unit ladder belong to the Product and propagate. Acquisition cost, in-service date, and meter reading belong to the Asset and never do — two lifts bought three years apart depreciate differently and that difference is the point.
- **Rates are versioned, not overwritten.** An open contract keeps the rate it was written at. `effective_from` / `effective_to` on RateCard gives you that for free, and lets you hang customer-specific pricing off the same table.

### Rental

```
Customer         customer_id, name, terms, credit_limit, credit_status, default_discount,
                 contact, phone, qbo_customer_id, tax_exempt_cert
Jobsite          jobsite_id, customer_id, name, address, county, delivery_zone_fee,
                 superintendent, po_number, active
Contract         contract_id, customer_id, jobsite_id, status, ordered_by, po_number,
                 delivery_date, signed_ticket_blob
ContractLine     line_id, contract_id, product_id, asset_id (null for bulk), qty,
                 uom_level, term, rate, start_datetime, expected_return, actual_return,
                 billed_through, min_term_days
Movement         movement_id, asset_id | product_id, qty, type, contract_line_id,
                 user_upn, occurred_at, meter_reading, jobsite_id, photo_blob, note
                 -- types: CHECKOUT, CHECKIN, TRANSFER, SERVICE_IN, SERVICE_OUT,
                 --        LOST, DAMAGED, ADJUST
WorkOrder        wo_id, asset_id, opened_at, closed_at, labor_cost, parts_cost, cause
```

`Movement` is append-only and is the source of truth for where anything is. Asset status is a materialized convenience, rebuildable from movements. Mistakes get a reversing movement, never a delete — that is what makes the audit trail defensible.

### Billing and depreciation

```
BillingPeriod    line_id, period_start, period_end, qty, rate, amount, qbo_invoice_id
DepreciationRun  run_id, period (YYYY-MM), method, total_amount, qbo_je_id, posted_at
DepreciationLine run_id, asset_id, amount, accumulated_after, nbv_after
```

**Depreciation method.** The prototype computes straight-line monthly: `(cost − salvage) ÷ useful_life_months`, floored at salvage, prorated from the in-service date. That is a defensible book basis for management reporting and matches how rental operators judge unit economics.

Two things to hold onto:
- Tax depreciation is a different schedule (MACRS, Section 179, bonus). Do not try to make one number serve both. Store book depreciation here; let your CPA handle tax.
- If you finance units, the loan is a separate liability in QBO. Book value and payoff balance diverge, and the gap is what actually matters when you decide whether to sell a unit.

Useful life defaults worth arguing about with your accountant: lifts and generators 84 months, trailers and containers 120–180, furniture 60–84, laptops and tablets 36. Technology depreciates faster than the fleet and should be priced accordingly — a $2,400 rugged laptop has to earn its cost back in about half the calendar time a scissor lift does.

---

## 4. Quoting, availability, and reservations

### Availability is a window query

The single thing to get right. A point-in-time stock count answers the wrong question — it will promise a unit that goes out again mid-window, and hide the four units coming back before the customer needs them.

```
free(sku, start, end) =
    total units of sku
  − units whose rental window overlaps [start, end]
  − units held for service across any part of [start, end]
  − quantity soft-held by other live quotes overlapping [start, end]
```

Two overlapping intervals satisfy `aStart <= bEnd AND bStart <= aEnd`. Index `ContractLine(product_id, start_datetime, expected_return)` and `Reservation(product_id, start, end)` — this query runs on every keystroke in the quote builder, so it has to be cheap.

When the answer is zero, return the earliest return date alongside it. "I can't do the 18th, but I have two back on the 27th" saves deals that a red X loses, and it costs one extra `MIN()`.

### Soft holds, hard allocation, and never by serial

Three distinct states, commonly collapsed into one and then regretted:

| State | Created by | Behavior |
|---|---|---|
| Soft hold | Quote sent | Decrements availability for other quotes. **Expires with the quote** and releases itself. |
| Hard allocation | Quote accepted | Committed against the SKU pool. Does not release on its own. |
| Assignment | Load sheet, morning of delivery | A specific tag leaves the yard. |

The expiry is not optional. Without it, your availability numbers become fiction within a quarter as dead quotes accumulate phantom commitments. Fourteen days is a reasonable default; run the release as a nightly job.

Assignment happens at dispatch, not at quote, because reserving `FL-4821` three weeks out creates a problem that didn't need to exist — it comes back damaged, or late, and now you're rewriting a commitment. Send whichever qualifying unit is standing in the yard, preferring the one idle longest so hours even out across the fleet.

### Rate laddering

A lift quoted for 9 days is $1,305 at the daily rate and $715 as a week plus two days. Same equipment, same dates. Quote the first number and you look expensive; compute it by hand and someone eventually gets it wrong.

The engine searches all legal combinations of the terms that SKU actually offers and takes the cheapest:

```
for m in 0..ceil(days/28):            # only if a monthly rate exists
  for w in 0..ceil(remaining/7):      # only if a weekly rate exists
    for d in 0..remaining:            # only if a daily rate exists
      if m*28 + w*7 + d >= days:
        cost = m*monthRate + w*weekRate + d*dayRate
        keep the minimum
```

The search space is tiny and it handles the edge cases for free: SKUs with no daily rate (trailers, containers) round up to 28-day increments, which is how you rent them anyway. Show the saving on the quote as a line item — you aren't discounting, you're being legible about your own rate card, and it reads as competence.

### The price waterfall

Order matters because each step compounds. **Store every step on the line**, not just the final number — when a GC disputes a price nine months later, you need to show your work.

List (laddered rate × base-unit qty) → customer negotiated rate → volume break → line discount → **rental subtotal** → damage waiver (% of rental, own income account) → delivery and pickup (by zone) → environmental or fuel fee → **taxable subtotal** → estimated tax (jobsite county) → deposit.

Two guardrails, both enforced server-side:

- **Approval threshold.** Total discount over ~15%, or a customer on credit hold, locks Send until an Ops role releases it. The front end explains why; the API decides.
- **Rate floor.** Compare the line's 28-day-equivalent net against that SKU's monthly depreciation plus target margin. You already store `cost`, `salvage`, and `useful_life_months` per asset, so this is nearly free. Flag it rather than block it — sometimes a loss leader is the right call, but it should be a decision, not an accident.

### Lifecycle

`Draft → Sent → Accepted → Converted → Dispatched → On rent → Returned → Closed`, with `Expired` and `Lost` branching off `Sent`.

Capture a reason on `Lost` — price, availability, timing, competitor. After two quarters that one field tells you whether you're losing on rate or on fleet mix, and those call for opposite responses.

Acceptance converts the quote to a Contract with lines copied and **rates frozen**. The rate card changes next month; this contract keeps what was signed.

### Dispatch and the packing list

Quoting reserves the pool; the load sheet binds the serials. That handoff is the most useful place in the whole system to enforce correctness, because it's the last moment before equipment leaves your control.

**Out and in are not mirror images, because they answer to different objects.** Check-out is the gate: equipment leaving the yard, driven by an accepted order, because the order is what the loader is working from. Check-in is also the gate — equipment coming back — but the driver arriving from a site has a *project* in front of him, not an order number. Some of what he brings back went out on an order months ago; some was checked out ad hoc and never had one. So the check-in picker lists open projects, meaning every jobsite currently holding equipment, derived from asset state rather than from order status. Selecting one shows what is standing on that site and accepts only tags that belong to it.

The other asymmetry: a load must be complete before it dispatches, but **a return can be partial**. Equipment comes back a truck at a time, and a project stays open until the last tag is scanned. That is what keeps a forgotten light tower from quietly leaving the books.

Rental time starts and stops at the gate in both directions — not when the superintendent called it off rent. Worth writing into the terms, because it is the most common billing argument in the business.

The scan session works against an order, not against the yard at large. Each scan is checked three ways before it joins the load: the SKU has to appear on the order, the unit has to read Available, and the order can't already be full on that line. Scan something that isn't on the quote and the app says so rather than silently accepting it — which is how equipment ends up on a jobsite that nobody is billing for.

Dispatch is blocked while any serialized line is short. Bulk lines are confirmed by count rather than scanned, because you tag the bundle and not the piece, and pretending otherwise just teaches the crew to scan one panel and check the box.

Confirming the load does four things in one transaction: assigns those tags to the contract lines, flips the assets to on rent with the contract's return date, writes a `CHECKOUT` movement per unit, and stamps the packing list onto the order. Receiving reverses it against whichever contract each returned tag actually belongs to — a single truck can carry units from more than one order — and each order closes itself when its last unit is back.

```
Fulfillment      fulfillment_id, contract_id, direction (OUT|IN), confirmed_by,
                 confirmed_at, signature_blob, note
FulfillmentLine  fulfillment_id, asset_id | product_id, qty_base, contract_line_id
```

The packing list is the customer-facing artifact — the thing the superintendent signs on delivery and the thing you produce when a GC claims they only ever received three light towers.

### Producing the documents

Three printed artifacts come out of this system, and all three are the same problem: render a document, hand someone paper, keep a copy.

| Document | Produced at | Signed by |
|---|---|---|
| Quotation | Quote sent | Contractor, to accept |
| Packing list | Load confirmed | Superintendent, on delivery |
| Return receipt | Units received back | Yard, releasing the contractor |

In the prototype these render as on-screen documents with print CSS, so the browser's print dialog saves them as PDF. That is genuinely sufficient for a yard — but it puts the file on whoever pressed the button, not in your records.

For production, render server-side and store the result: a Function that takes the fulfillment ID, renders the same HTML template headless (Playwright or Puppeteer), writes the PDF to Blob Storage, and stamps the blob URL onto the `Fulfillment` row. Now the signed delivery ticket lives next to the contract instead of in a driver's email, which is the whole reason you wanted it. Capture the superintendent's signature on the phone at delivery and composite it into the same render.

The asset tag sheet is the fourth artifact and the odd one out — it prints labels, not records, so it needs no copy. Print black on white at the label's real size rather than reproducing the dark on-screen plate; ink coverage matters when you're running a hundred polyester labels.

### Additional tables

```
Quote        quote_id, customer_id, jobsite_id, status, po_number, prepared_by,
             window_start, window_end, waiver, delivery, created_at, expires_at,
             sent_at, accepted_at, lost_reason, qbo_estimate_id
QuoteLine    line_id, quote_id, product_id, qty, uom_level, start, end,
             ladder_json, list_amount, customer_disc, volume_disc, line_disc,
             net_amount, floor_amount, approved_by
Reservation  res_id, product_id, qty_base, start, end, quote_id, kind, released_at
             -- kind: SOFT (quote) | HARD (accepted)
Approval     approval_id, quote_id, rule, requested_by, decided_by, decided_at, note
```

`ladder_json` stores the term combination that produced the price. It's what lets you reprint a quote a year later and have it still make sense.

## 5. QR tagging

**What the code encodes:** a short absolute URL, `https://cls.yourdomain.com/a/FL-4821`. Not JSON, not a raw ID. A URL means any phone camera works with no app installed — the link opens the scan screen with the tag pre-filled and a sign-in prompt in front of it.

**Tag ID format:** `FL-` plus a 4-digit sequence. Short, readable over a radio, and human-typable when a label gets destroyed. Print it in large text under the code — that fallback earns its keep.

**Label spec:**

| Use | Material | Size |
|---|---|---|
| Lifts, generators, trailers, containers | Anodized aluminum or polyester with UV laminate, rivet or 3M 468MP adhesive | 3 × 2 in |
| Furniture, tech | Polyester asset label, tamper-evident | 2 × 1 in |
| Bulk (fence, chairs, tables) | Tag the **bundle or pallet**, not the piece | 3 × 2 in |

That last row is the one people get wrong. Nobody is scanning 240 fence panels. Tag the bundle, scan once, decrement 12 base units.

**Two codes per big unit.** One on the control panel, one on the opposite side. Labels get scraped off in a laydown yard, and a second code costs pennies against a lost asset.

In production, generate codes with `qrcode.react` or a server-side library at error correction level M and a quiet zone of at least 4 modules. The matrix rendered in the prototype is decorative placeholder art, not a scannable code.

---

## 6. QuickBooks Online integration

Use the official Intuit REST API v3 with OAuth 2.0. Store the refresh token in Key Vault and rotate it on every use — Intuit refresh tokens expire in 100 days, and an unrotated one is the most common way these integrations quietly die.

### Record mapping

| CLS | QuickBooks Online | Notes |
|---|---|---|
| Customer (GC) | Customer | One per GC |
| Jobsite | Sub-customer, billed with parent | Keeps job costing clean without duplicating the GC |
| Quote | Estimate | Pushed on Send, not on Draft — abandoned drafts shouldn't clutter the books. Links downstream to the invoices raised from it |
| Rental line | Invoice line → Service item | One service item per SKU + term, e.g. `Rental : Scissor Lift 19ft : 28-day` |
| Delivery / pickup | Invoice line → Service item | Taxed separately from rental |
| Damage waiver | Invoice line → Service item | Own income account, % of rental subtotal |
| Deposit | Payment on account | A **liability**, not revenue, until the first rental period is billed. Apply against the first cycle invoice |
| Asset purchase | Fixed Asset account | Created on receipt, `asset_id` written back to CLS |
| Monthly depreciation | Journal Entry | Dr depreciation expense, Cr accumulated depreciation, split by class |
| Repair parts and labor | Bill or Expense | Tag the asset in a custom field so unit economics stay honest |

### Sync design

- **CLS → QBO only** for invoices, journal entries, and asset records. One-way avoids the conflict resolution problem entirely.
- **QBO → CLS** for payment status and customer balances, pulled on a schedule so a dispatcher can see a credit hold before releasing equipment.
- Use the **batch endpoint** and respect the rate limit (500 requests/minute per realm). Queue everything through Azure Service Bus or a SQL work table with retry and dead-letter — never post inline on a user's click.
- Store `qbo_invoice_id` and `SyncToken` on every record you push. QBO rejects updates with a stale SyncToken, and that error is your signal to re-read before retrying.
- Make posts **idempotent**: a natural key of `contract_line_id + period_start` prevents the double-invoice that happens the first time a retry fires after a timeout.

### Depreciation posting

QBO does not compute depreciation. The nightly Function runs on the first of each month: compute `DepreciationRun`, post one Journal Entry with lines split by asset class, store the returned `qbo_je_id`. If the JE fails, the run stays open and alerts — never let it silently skip a month.

### Florida sales tax

Let QBO's automated sales tax engine handle it, driven by the jobsite address you send on the invoice. Florida taxes the rental of tangible personal property, and the discretionary surtax varies by county — Hillsborough, Pinellas, and Orange all differ. Hard-coding a rate will be wrong the first time you deliver across a county line.

Before go-live, confirm three things with your CPA specifically: the treatment of **delivery and pickup charges**, whether your **damage waiver** is taxable, and how you handle **resale or exemption certificates** for GCs who claim them. These are the three that cause assessments.

---

## 7. Build sequence

**Phase 1 — the spine (4–6 weeks).** Sign-in and the invitation flow, contractors and jobsites, asset and product tables with receiving, QR generation and label printing, scan check-in/check-out, current-state dashboard. Stop here and use it in the yard for two weeks before writing anything else. The scanning workflow is where the design either survives contact with a yard crew or does not.

**Phase 2 — money (4–5 weeks).** Rate cards, the availability window query, quoting with rate laddering and soft holds, contracts, billing periods, depreciation engine, QBO customer, estimate, and invoice sync. Availability and laddering are the two pieces worth building carefully — everything else in this phase is bookkeeping.

**Phase 3 — the rest (3–4 weeks).** Reporting, work orders and maintenance, contractor guest portal, depreciation journal entries, overdue notifications.

**Phase 4 — polish.** Reservation calendar, delivery routing, meter-based billing for powered equipment, photo-based damage documentation at check-in.

### Two things to decide before Phase 1

**Serialized versus bulk, per SKU.** Serialize anything with a serial number, a meter, or a replacement cost over roughly $500. Everything else is a counted pool. Getting this wrong in either direction is painful to unwind: serialize chairs and your crew will hate the app, pool your generators and you will lose one.

**Your rental period convention.** The prototype uses day / 7-day week / 28-day month, which is standard in equipment rental and is what your rate card should say out loud. Whatever you pick, encode it once in the billing engine — the ambiguity between "month" and "28 days" is worth thousands a year in disputed invoices.

---

## 8. What the prototype does and does not do

**Does:** full navigation and state, mode-switched check-out and check-in driven by an order, UOM ladders, three-tier rate cards, straight-line depreciation with per-asset schedules, utilization by time and by dollar, ROI and payback per unit, idle capital report, QBO mapping and posting queue, role model. Plus the full quote desk — window-based availability with next-free dates, rate laddering, the price waterfall, approval and rate-floor guardrails, soft holds that change what other quotes can promise, and a printable quote document. Assets and bulk pools can be received and edited in place; models and SKUs can be created and edited with their rate card and unit ladder, and changes propagate to units already on the yard. Contractors and jobsites are fully editable, and jobsite county and zone feed straight back into quote pricing. The yard dashboard rolls open quote value and committed contract value up by jobsite, and the scan bay prints a packing list, a return receipt, and a QR tag sheet.

**Does not:** persist anything (refresh resets it), talk to a real API, or generate scannable QR codes. Documents print through the browser dialog rather than being rendered and stored server-side. Delivery routing, work orders, e-signature capture, and partial returns of bulk quantities are still open. Bulk availability is also approximate — the seed data has no per-unit return dates for pooled stock, so a bulk pool is treated as unavailable for the whole window rather than freeing up as units come back. Serialized availability is exact.

The seeded numbers are illustrative. Replace the `CATALOG` array with your real SKUs, costs, and rates and the dashboards become immediately meaningful — that is the fastest way to pressure-test whether the model fits how you actually rent.
