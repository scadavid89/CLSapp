import { app } from "@azure/functions";
import { query, transaction } from "../../shared/db.js";
import { handler, requireRole } from "../../shared/auth.js";

const EDITORS = ["ops", "admin"];

/* The model owns name, description, rate card and unit ladder — they apply
   to every unit. Acquisition cost and in-service date are facts about one
   purchase and are deliberately not touched here. */
app.http("productUpsert", {
  methods: ["POST", "PUT"],
  authLevel: "anonymous",
  route: "products/{sku?}",
  handler: handler(async (request) => {
    requireRole(request, EDITORS);
    const b = await request.json();
    const sku = (request.params.sku || b.sku || "").toUpperCase();
    if (!sku) throw Object.assign(new Error("SKU is required"), { status: 400 });
    if (!b.rates || !(b.rates.day || b.rates.week || b.rates.month)) {
      throw Object.assign(new Error("At least one rental term must be priced"), { status: 400 });
    }

    return transaction(async (q) => {
      await q(`
        MERGE cls.Product AS t USING (VALUES (@sku)) AS s(sku) ON t.sku = s.sku
        WHEN MATCHED THEN UPDATE SET
          name = @name, description = @desc, category = @cat, has_meter = @meter,
          default_cost = @cost, useful_life_months = @life, salvage_default = @salv,
          rate_day = @rd, rate_week = @rw, rate_month = @rm, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN INSERT
          (sku, name, description, category, serialized, has_meter, default_cost,
           useful_life_months, salvage_default, rate_day, rate_week, rate_month)
          VALUES (@sku, @name, @desc, @cat, @ser, @meter, @cost, @life, @salv, @rd, @rw, @rm);`,
        { sku, name: b.name, desc: b.desc || null, cat: b.cat, ser: !!b.ser, meter: !!b.meter,
          cost: b.cost, life: b.life, salv: b.salv,
          rd: b.rates.day || 0, rw: b.rates.week || 0, rm: b.rates.month || 0 });

      await q("DELETE FROM cls.ProductUom WHERE sku = @sku", { sku });
      for (let i = 0; i < (b.uom || []).length; i++) {
        await q("INSERT cls.ProductUom (sku, [level], name, base_qty) VALUES (@sku, @lvl, @n, @q)",
          { sku, lvl: i + 1, n: b.uom[i][0], q: i === 0 ? 1 : b.uom[i][1] });
      }
      const [row] = await q("SELECT * FROM cls.Product WHERE sku = @sku", { sku });
      const uom = await q("SELECT name, base_qty FROM cls.ProductUom WHERE sku = @sku ORDER BY [level]", { sku });
      return {
        sku: row.sku, name: row.name, desc: row.description, cat: row.category,
        ser: !!row.serialized, meter: !!row.has_meter, cost: Number(row.default_cost),
        life: row.useful_life_months, salv: Number(row.salvage_default),
        rates: { day: Number(row.rate_day), week: Number(row.rate_week), month: Number(row.rate_month) },
        uom: uom.map((u) => [u.name, u.base_qty]),
      };
    });
  }),
});
