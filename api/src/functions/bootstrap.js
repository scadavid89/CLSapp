import { app } from "@azure/functions";
import { query } from "../../shared/db.js";
import { handler, requireRole, scopeToCustomer, principal } from "../../shared/auth.js";

const ALL = ["yard", "dispatch", "ops", "finance", "admin", "customer"];

/* One round trip on load. Catalog, directory, fleet, and open quotes are a
   few hundred rows total — cheaper as one payload than nine requests, and
   it keeps the client's derived numbers internally consistent. */
app.http("bootstrap", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "bootstrap",
  handler: handler(async (request) => {
    const user = requireRole(request, ALL);
    const scoped = scopeToCustomer(user);
    const custId = scoped ? await customerFor(user) : null;

    const [products, uoms, customers, jobsites, assets, pools, quotes, lines, packed, config, surtax] =
      await Promise.all([
        query("SELECT * FROM cls.Product WHERE active = 1 ORDER BY category, sku"),
        query("SELECT * FROM cls.ProductUom ORDER BY sku, [level]"),
        query(scoped
          ? "SELECT * FROM cls.Customer WHERE customer_id = @cid"
          : "SELECT * FROM cls.Customer ORDER BY name", scoped ? { cid: custId } : {}),
        query(scoped
          ? "SELECT * FROM cls.Jobsite WHERE customer_id = @cid ORDER BY name"
          : "SELECT * FROM cls.Jobsite ORDER BY name", scoped ? { cid: custId } : {}),
        query(assetSql(scoped, user), scoped ? { cid: custId } : {}),
        query("SELECT * FROM cls.vStockPool ORDER BY sku"),
        query(scoped
          ? "SELECT * FROM cls.Quote WHERE customer_id = @cid ORDER BY created_at DESC"
          : "SELECT * FROM cls.Quote ORDER BY created_at DESC", scoped ? { cid: custId } : {}),
        query("SELECT * FROM cls.QuoteLine ORDER BY quote_id, line_no"),
        query(`SELECT f.quote_id, f.jobsite_id, f.direction, fl.tag
               FROM cls.Fulfillment f JOIN cls.FulfillmentLine fl ON fl.fulfillment_id = f.fulfillment_id`),
        query("SELECT [key], [value] FROM cls.Config"),
        query("SELECT county, surtax_pct FROM cls.CountySurtax"),
      ]);

    return {
      user: { upn: user.upn, roles: user.roles, customerId: custId },
      products: shapeProducts(products, uoms, user),
      customers, jobsites,
      assets: assets.map((a) => shapeAsset(a, user)),
      pools,
      quotes: shapeQuotes(quotes, lines, packed),
      config: Object.fromEntries(config.map((c) => [c.key, Number(c.value)])),
      countySurtax: Object.fromEntries(surtax.map((c) => [c.county, Number(c.surtax_pct)])),
      serverDate: new Date().toISOString().slice(0, 10),
    };
  }),
});

function assetSql(scoped) {
  const cols = `a.asset_id, a.tag, a.sku, a.status, a.condition, a.yard_bin, a.meter_hours,
    a.customer_id, j.name AS jobsite, a.term, a.rental_start, a.expected_return,
    a.acquisition_cost, a.useful_life_months, a.salvage_value, a.in_service_date, a.ltd_revenue`;
  return `SELECT ${cols} FROM cls.Asset a
          LEFT JOIN cls.Jobsite j ON j.jobsite_id = a.jobsite_id
          WHERE a.disposed_date IS NULL ${scoped ? "AND a.customer_id = @cid" : ""}
          ORDER BY a.sku, a.tag`;
}

/* Cost, book value and margin never leave the server for yard or customer
   roles. Hiding a column in the UI is not access control. */
function shapeAsset(a, user) {
  const sensitive = user.roles.some((r) => ["ops", "finance", "admin", "dispatch"].includes(r));
  const base = {
    id: a.asset_id, tag: a.tag, sku: a.sku, status: a.status, cond: a.condition,
    bin: a.yard_bin, meter: a.meter_hours, cust: a.customer_id, site: a.jobsite,
    term: a.term, start: a.rental_start, due: a.expected_return,
  };
  if (!sensitive) return base;
  return {
    ...base,
    cost: Number(a.acquisition_cost), life: a.useful_life_months,
    salv: Number(a.salvage_value), inSvc: a.in_service_date, ltdRev: Number(a.ltd_revenue),
  };
}

function shapeProducts(products, uoms, user) {
  const sensitive = user.roles.some((r) => ["ops", "finance", "admin", "dispatch"].includes(r));
  return products.map((p) => ({
    sku: p.sku, name: p.name, desc: p.description, cat: p.category,
    ser: !!p.serialized, meter: !!p.has_meter,
    rates: { day: Number(p.rate_day), week: Number(p.rate_week), month: Number(p.rate_month) },
    uom: uoms.filter((u) => u.sku === p.sku).map((u) => [u.name, u.base_qty]),
    ...(sensitive ? {
      cost: Number(p.default_cost), life: p.useful_life_months, salv: Number(p.salvage_default),
    } : {}),
  }));
}

function shapeQuotes(quotes, lines, packed) {
  return quotes.map((q) => ({
    id: q.quote_id, cust: q.customer_id, jobsiteId: q.jobsite_id, site: q.jobsite_name,
    status: q.status, po: q.po_number || "", waiver: !!q.waiver, delivery: !!q.delivery,
    start: q.window_start, end: q.window_end, created: q.created_at, expires: q.expires_at,
    lostTo: q.lost_reason, posted: !!q.posted_qbo,
    lines: lines.filter((l) => l.quote_id === q.quote_id).map((l) => ({
      id: l.line_id, sku: l.sku, qty: l.qty, uomIdx: l.uom_level - 1,
      start: l.start_date, end: l.end_date, disc: Number(l.discount_pct),
    })),
    packed: packed.filter((f) => f.quote_id === q.quote_id && f.direction === "OUT").map((f) => f.tag),
    returned: packed.filter((f) => f.quote_id === q.quote_id && f.direction === "IN").map((f) => f.tag),
  }));
}

async function customerFor(user) {
  const rows = await query(
    "SELECT customer_id FROM cls.AppUser WHERE provider = @p AND subject_id = @s AND disabled_at IS NULL",
    { p: user.provider, s: user.subject });
  return rows.length ? rows[0].customer_id : "__none__";
}
