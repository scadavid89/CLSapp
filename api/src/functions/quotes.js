import { app } from "@azure/functions";
import { query, transaction } from "../../shared/db.js";
import { handler, requireRole } from "../../shared/auth.js";

const QUOTERS = ["dispatch", "ops", "finance", "admin"];

app.http("quoteUpsert", {
  methods: ["POST", "PUT"],
  authLevel: "anonymous",
  route: "quotes/{id?}",
  handler: handler(async (request) => {
    const user = requireRole(request, QUOTERS);
    const b = await request.json();

    return transaction(async (q) => {
      let id = request.params.id || b.id;
      if (!id) {
        const [{ next }] = await q(`
          SELECT 'Q-' + CAST(ISNULL(MAX(TRY_CAST(SUBSTRING(quote_id,3,10) AS INT)), 2400) + 1 AS VARCHAR(10)) AS next
          FROM cls.Quote WITH (UPDLOCK, HOLDLOCK)`);
        id = next;
      }

      await q(`
        MERGE cls.Quote AS t USING (VALUES (@id)) AS s(id) ON t.quote_id = s.id
        WHEN MATCHED THEN UPDATE SET customer_id=@cust,
          jobsite_id=(SELECT jobsite_id FROM cls.Jobsite WHERE name=@site),
          po_number=@po, waiver=@waiver, delivery=@delivery,
          window_start=@ws, window_end=@we, updated_at=SYSUTCDATETIME()
        WHEN NOT MATCHED THEN INSERT
          (quote_id,customer_id,jobsite_id,status,po_number,waiver,delivery,
           window_start,window_end,expires_at,prepared_by)
          VALUES (@id,@cust,(SELECT jobsite_id FROM cls.Jobsite WHERE name=@site),'Draft',@po,
            @waiver,@delivery,@ws,@we,
            DATEADD(DAY,(SELECT [value] FROM cls.Config WHERE [key]='quote_hold_days'),CAST(SYSUTCDATETIME() AS DATE)),
            @by);`,
        { id, cust: b.cust, site: b.site, po: b.po || null, waiver: !!b.waiver,
          delivery: !!b.delivery, ws: b.start, we: b.end, by: user.upn });

      await q("DELETE FROM cls.QuoteLine WHERE quote_id = @id", { id });
      const lines = b.lines || [];
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await q(`INSERT cls.QuoteLine (quote_id,line_no,sku,qty,uom_level,start_date,end_date,discount_pct)
                 VALUES (@id,@no,@sku,@qty,@uom,@s,@e,@d)`,
          { id, no: i + 1, sku: l.sku, qty: l.qty, uom: (l.uomIdx ?? 0) + 1,
            s: l.start, e: l.end, d: l.disc || 0 });
      }
      return { id };
    });
  }),
});

/* Sending is the moment the hold becomes real, so the checks live here and
   not in the browser: credit hold and the discount ceiling both block. */
app.http("quoteTransition", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "quotes/{id}/{action}",
  handler: handler(async (request) => {
    const user = requireRole(request, QUOTERS);
    const { id, action } = request.params;
    const b = await request.json().catch(() => ({}));

    const [quote] = await query(`
      SELECT q.*, c.credit_status, c.default_discount
      FROM cls.Quote q JOIN cls.Customer c ON c.customer_id = q.customer_id
      WHERE q.quote_id = @id`, { id });
    if (!quote) throw Object.assign(new Error("Quote not found"), { status: 404 });

    switch (action) {
      case "send": {
        if (quote.credit_status === "hold" && !user.roles.includes("finance") && !user.roles.includes("admin")) {
          throw Object.assign(new Error("Customer is on credit hold — accounting must clear the account"), { status: 409 });
        }
        const [{ maxDisc }] = await query(`
          SELECT ISNULL(MAX(discount_pct), 0) + @base AS maxDisc
          FROM cls.QuoteLine WHERE quote_id = @id`, { id, base: Number(quote.default_discount) });
        const [{ limit }] = await query(
          "SELECT [value] AS limit FROM cls.Config WHERE [key] = 'approval_threshold_pct'");
        if (Number(maxDisc) > Number(limit) && !user.roles.includes("ops") && !user.roles.includes("admin")) {
          throw Object.assign(new Error(
            `Discount reaches ${Math.round(maxDisc)}%, over the ${limit}% desk limit. An Ops role must release it.`),
            { status: 409 });
        }
        const [{ hold }] = await query("SELECT [value] AS hold FROM cls.Config WHERE [key] = 'quote_hold_days'");
        await query(`UPDATE cls.Quote SET status='Sent',
                       expires_at = DATEADD(DAY, @hold, CAST(SYSUTCDATETIME() AS DATE)),
                       updated_at = SYSUTCDATETIME() WHERE quote_id=@id`, { id, hold: Number(hold) });
        break;
      }
      case "accept":
        await query("UPDATE cls.Quote SET status='Accepted', updated_at=SYSUTCDATETIME() WHERE quote_id=@id", { id });
        break;
      case "lose":
        await query(`UPDATE cls.Quote SET status='Lost', lost_reason=@r, updated_at=SYSUTCDATETIME()
                     WHERE quote_id=@id`, { id, r: b.reason || "Price" });
        break;
      case "post":
        await query("UPDATE cls.Quote SET posted_qbo=1, updated_at=SYSUTCDATETIME() WHERE quote_id=@id", { id });
        break;
      default:
        throw Object.assign(new Error("Unknown action"), { status: 400 });
    }
    const [row] = await query("SELECT status, expires_at, posted_qbo FROM cls.Quote WHERE quote_id=@id", { id });
    return row;
  }),
});

app.http("quoteDelete", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "quotes/{id}",
  handler: handler(async (request) => {
    requireRole(request, ["ops", "admin"]);
    await query("DELETE FROM cls.Quote WHERE quote_id=@id AND status='Draft'", { id: request.params.id });
  }),
});
