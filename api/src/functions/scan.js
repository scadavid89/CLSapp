import { app } from "@azure/functions";
import { query, proc } from "../../shared/db.js";
import { handler, requireRole } from "../../shared/auth.js";

const SCANNERS = ["yard", "dispatch", "ops", "admin"];

/* Every scan is validated here before it joins a load. The browser check is
   for speed of feedback; this one decides. */
app.http("scanLookup", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "scan/{tag}",
  handler: handler(async (request) => {
    requireRole(request, SCANNERS);
    const rows = await query(`
      SELECT a.asset_id AS id, a.tag, a.sku, p.name, p.category AS cat, a.status,
             a.condition AS cond, a.yard_bin AS bin, a.meter_hours AS meter,
             a.customer_id AS cust, j.name AS site, j.jobsite_id AS siteId,
             a.term, a.rental_start AS start, a.expected_return AS due
      FROM cls.Asset a
      JOIN cls.Product p ON p.sku = a.sku
      LEFT JOIN cls.Jobsite j ON j.jobsite_id = a.jobsite_id
      WHERE a.tag = @tag`, { tag: request.params.tag.toUpperCase() });
    if (!rows.length) throw Object.assign(new Error("No asset carries that tag"), { status: 404 });
    return rows[0];
  }),
});

/* Check-out: equipment leaving the yard, driven by an accepted order.
   A load must be complete before it dispatches. */
app.http("checkOut", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "scan/checkout",
  handler: handler(async (request) => {
    const user = requireRole(request, SCANNERS);
    const b = await request.json();
    if (!b.quoteId || !Array.isArray(b.tags) || !b.tags.length) {
      throw Object.assign(new Error("An order and at least one tag are required"), { status: 400 });
    }

    const short = await query(`
      SELECT ql.sku, ql.qty * ISNULL(u.base_qty,1) AS need,
             (SELECT COUNT(*) FROM cls.Asset a
              WHERE a.sku = ql.sku AND a.tag IN (SELECT [value] FROM OPENJSON(@tags))) AS scanned
      FROM cls.QuoteLine ql
      JOIN cls.Product p ON p.sku = ql.sku AND p.serialized = 1
      LEFT JOIN cls.ProductUom u ON u.sku = ql.sku AND u.[level] = ql.uom_level
      WHERE ql.quote_id = @q`, { q: b.quoteId, tags: JSON.stringify(b.tags) });

    const missing = short.filter((r) => r.scanned < r.need);
    if (missing.length) {
      throw Object.assign(new Error(
        "Order is short: " + missing.map((m) => `${m.sku} ${m.scanned}/${m.need}`).join(", ")),
        { status: 409 });
    }

    const res = await proc("cls.spCheckOut", {
      quote_id: b.quoteId, tags: JSON.stringify(b.tags), user: user.upn,
    });
    return { fulfillmentId: res[0]?.fulfillment_id };
  }),
});

/* Check-in: equipment coming back from a jobsite. Driven by the project,
   because the driver has a site in front of him, not an order number — and
   his truck may hold units from several orders or none. Partial is normal. */
app.http("checkIn", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "scan/checkin",
  handler: handler(async (request) => {
    const user = requireRole(request, SCANNERS);
    const b = await request.json();
    if (!Array.isArray(b.tags) || !b.tags.length) {
      throw Object.assign(new Error("At least one tag is required"), { status: 400 });
    }
    const res = await proc("cls.spCheckIn", {
      jobsite_id: b.jobsiteId ?? null,
      tags: JSON.stringify(b.tags),
      user: user.upn,
      to_service: b.toService ? 1 : 0,
    });
    return { fulfillmentId: res[0]?.fulfillment_id };
  }),
});

app.http("gateLog", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "movements",
  handler: handler(async (request) => {
    requireRole(request, SCANNERS);
    return query(`
      SELECT TOP 60 tag, sku, movement_type, quote_id, user_upn, occurred_at, note,
             (SELECT name FROM cls.Jobsite WHERE jobsite_id = m.jobsite_id) AS site
      FROM cls.Movement m
      WHERE movement_type IN ('CHECKOUT','CHECKIN','SERVICE_IN')
      ORDER BY occurred_at DESC`);
  }),
});
