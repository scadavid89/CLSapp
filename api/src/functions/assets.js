import { app } from "@azure/functions";
import { query, transaction } from "../../shared/db.js";
import { handler, requireRole } from "../../shared/auth.js";

const EDITORS = ["ops", "admin"];

app.http("assetUpdate", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "assets/{id}",
  handler: handler(async (request) => {
    const user = requireRole(request, EDITORS);
    const id = request.params.id;
    const b = await request.json();

    /* Status is changed by scanning, not by editing a form. Letting a text
       field set "On rent" would put a unit on a jobsite with no contract,
       no dates, and no movement row. */
    const status = ["Available", "In service", "In transit"].includes(b.status) ? b.status : null;

    await query(`
      UPDATE cls.Asset SET
        tag = @tag, condition = @cond, yard_bin = @bin, meter_hours = @meter,
        acquisition_cost = @cost, useful_life_months = @life, salvage_value = @salv,
        in_service_date = @inSvc,
        status = COALESCE(@status, status),
        customer_id     = CASE WHEN @status = 'Available' THEN NULL ELSE customer_id END,
        jobsite_id      = CASE WHEN @status = 'Available' THEN NULL ELSE jobsite_id END,
        term            = CASE WHEN @status = 'Available' THEN NULL ELSE term END,
        rental_start    = CASE WHEN @status = 'Available' THEN NULL ELSE rental_start END,
        expected_return = CASE WHEN @status = 'Available' THEN NULL ELSE expected_return END,
        updated_at = SYSUTCDATETIME()
      WHERE asset_id = @id`, {
        id, tag: b.tag, cond: b.cond, bin: b.bin,
        meter: b.meter ?? null, cost: b.cost, life: b.life, salv: b.salv,
        inSvc: b.inSvc, status,
      });

    await query(`INSERT cls.Movement (tag, sku, movement_type, user_upn, note)
                 SELECT tag, sku, 'ADJUST', @u, 'Record edited' FROM cls.Asset WHERE asset_id = @id`,
                { id, u: user.upn });
    return one(id);
  }),
});

/* Receiving. Tags are minted inside the transaction — two people receiving
   at once must not both be handed FL-1234. */
app.http("assetsReceive", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "assets",
  handler: handler(async (request) => {
    const user = requireRole(request, EDITORS);
    const b = await request.json();
    const count = Math.max(1, Math.min(50, Number(b.count) || 1));

    return transaction(async (q) => {
      const [{ maxNum }] = await q(`
        SELECT ISNULL(MAX(TRY_CAST(SUBSTRING(tag, 4, 12) AS INT)), 1000) AS maxNum
        FROM cls.Asset WITH (UPDLOCK, HOLDLOCK) WHERE tag LIKE 'FL-%'`);

      const made = [];
      for (let i = 1; i <= count; i++) {
        const tag = "FL-" + (maxNum + i);
        const id = `${b.sku}-${tag}`;
        await q(`INSERT cls.Asset (asset_id, tag, sku, acquisition_cost, useful_life_months,
                   salvage_value, in_service_date, status, condition, yard_bin, meter_hours)
                 VALUES (@id, @tag, @sku, @cost, @life, @salv, @inSvc, 'Available', @cond, @bin,
                   (SELECT CASE WHEN has_meter = 1 THEN 0 ELSE NULL END FROM cls.Product WHERE sku = @sku))`,
          { id, tag, sku: b.sku, cost: b.cost, life: b.life, salv: b.salv, inSvc: b.inSvc,
            cond: b.cond || "Good", bin: b.bin || "Receiving" });
        await q(`INSERT cls.Movement (tag, sku, movement_type, user_upn, note)
                 VALUES (@tag, @sku, 'RECEIVE', @u, 'Received into fleet')`,
          { tag, sku: b.sku, u: user.upn });
        made.push({ id, tag });
      }
      return { received: made };
    });
  }),
});

async function one(id) {
  const rows = await query(`
    SELECT a.asset_id AS id, a.tag, a.sku, a.status, a.condition AS cond, a.yard_bin AS bin,
           a.meter_hours AS meter, a.customer_id AS cust, j.name AS site, a.term,
           a.rental_start AS start, a.expected_return AS due, a.acquisition_cost AS cost,
           a.useful_life_months AS life, a.salvage_value AS salv, a.in_service_date AS inSvc,
           a.ltd_revenue AS ltdRev
    FROM cls.Asset a LEFT JOIN cls.Jobsite j ON j.jobsite_id = a.jobsite_id
    WHERE a.asset_id = @id`, { id });
  return rows[0];
}
