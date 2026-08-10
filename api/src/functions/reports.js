import { app } from "@azure/functions";
import { query, proc } from "../../shared/db.js";
import { handler, requireRole } from "../../shared/auth.js";

const READERS = ["ops", "finance", "admin"];

/* Depreciation is computed in SQL over the whole fleet rather than in the
   browser, because the register has to tie to what gets posted. */
app.http("depreciationRegister", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "reports/depreciation",
  handler: handler(async (request) => {
    requireRole(request, READERS);
    return query(`
      SELECT a.tag, p.name, p.category, a.in_service_date, a.useful_life_months,
             a.acquisition_cost,
             (a.acquisition_cost - a.salvage_value) / a.useful_life_months AS per_month,
             CASE WHEN DATEDIFF(MONTH, a.in_service_date, GETUTCDATE()) > a.useful_life_months
                  THEN a.useful_life_months
                  ELSE DATEDIFF(MONTH, a.in_service_date, GETUTCDATE()) END AS months_elapsed,
             a.ltd_revenue
      FROM cls.Asset a JOIN cls.Product p ON p.sku = a.sku
      WHERE a.disposed_date IS NULL
      ORDER BY a.acquisition_cost DESC`);
  }),
});

app.http("runDepreciation", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "reports/depreciation/{period}",
  handler: handler(async (request) => {
    requireRole(request, ["finance", "admin"]);
    return proc("cls.spDepreciationRun", { period: request.params.period });
  }),
});

/* Utilization two ways. Time utilization is what the yard feels; dollar
   utilization is what the balance sheet feels, and they diverge when the
   expensive units are the idle ones. */
app.http("utilization", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "reports/utilization",
  handler: handler(async (request) => {
    requireRole(request, READERS);
    return query(`
      SELECT p.sku, p.name, p.category,
             COUNT(a.asset_id) AS units,
             SUM(CASE WHEN a.status = 'On rent' THEN 1 ELSE 0 END) AS on_rent,
             SUM(a.acquisition_cost) AS original_cost,
             SUM(CASE WHEN a.status = 'On rent' THEN a.acquisition_cost ELSE 0 END) AS deployed_cost,
             SUM(a.ltd_revenue) AS ltd_revenue
      FROM cls.Product p JOIN cls.Asset a ON a.sku = p.sku
      WHERE a.disposed_date IS NULL
      GROUP BY p.sku, p.name, p.category
      ORDER BY SUM(a.ltd_revenue) / NULLIF(SUM(a.acquisition_cost), 0) DESC`);
  }),
});

app.http("expireQuotes", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "maintenance/expire-quotes",
  handler: handler(async (request) => {
    requireRole(request, ["ops", "admin"]);
    return proc("cls.spExpireQuotes");
  }),
});

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: handler(async () => {
    const [row] = await query("SELECT COUNT(*) AS assets FROM cls.Asset");
    return { ok: true, assets: row.assets, at: new Date().toISOString() };
  }),
});
