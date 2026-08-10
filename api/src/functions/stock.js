import { app } from "@azure/functions";
import { query } from "../../shared/db.js";
import { handler, requireRole } from "../../shared/auth.js";

const EDITORS = ["ops", "admin"];

app.http("stockUpsert", {
  methods: ["POST", "PUT"],
  authLevel: "anonymous",
  route: "stock",
  handler: handler(async (request) => {
    const user = requireRole(request, EDITORS);
    const b = await request.json();
    const add = Number(b.add) || 0;

    await query(`
      MERGE cls.StockPool AS t
      USING (VALUES (@sku)) AS s(sku) ON t.sku = s.sku
      WHEN MATCHED THEN UPDATE SET
        qty_total = t.qty_total + @add,
        qty_service = COALESCE(@svc, t.qty_service),
        unit_cost = @cost, useful_life_months = @life, salvage_value = @salv,
        yard_bin = @bin, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT
        (sku, qty_total, qty_on_rent, qty_service, unit_cost, useful_life_months,
         salvage_value, in_service_date, yard_bin)
        VALUES (@sku, @add, 0, 0, @cost, @life, @salv, @inSvc, @bin);`,
      { sku: b.sku, add, svc: b.svc ?? null, cost: b.cost, life: b.life,
        salv: b.salv, inSvc: b.inSvc, bin: b.bin || "Yard A" });

    if (add > 0) {
      await query(`INSERT cls.Movement (sku, qty_base, movement_type, user_upn, note)
                   VALUES (@sku, @add, 'RECEIVE', @u, 'Stock received')`,
        { sku: b.sku, add, u: user.upn });
    }
    const rows = await query("SELECT * FROM cls.vStockPool WHERE sku = @sku", { sku: b.sku });
    return rows[0];
  }),
});
