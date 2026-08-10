import { app } from "@azure/functions";
import { query } from "../../shared/db.js";
import { handler, requireRole } from "../../shared/auth.js";

const EDITORS = ["dispatch", "ops", "admin"];

app.http("customerUpsert", {
  methods: ["POST", "PUT"],
  authLevel: "anonymous",
  route: "customers/{id?}",
  handler: handler(async (request) => {
    requireRole(request, EDITORS);
    const b = await request.json();
    const id = request.params.id || b.id;
    await query(`
      MERGE cls.Customer AS t USING (VALUES (@id)) AS s(id) ON t.customer_id = s.id
      WHEN MATCHED THEN UPDATE SET name=@name, contact=@contact, phone=@phone, city=@city,
        terms=@terms, default_discount=@disc, credit_status=@credit,
        qbo_customer_id=@qbo, updated_at=SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT
        (customer_id,name,contact,phone,city,terms,default_discount,credit_status,qbo_customer_id)
        VALUES (@id,@name,@contact,@phone,@city,@terms,@disc,@credit,@qbo);`,
      { id, name: b.name, contact: b.contact || null, phone: b.phone || null, city: b.city || null,
        terms: b.terms, disc: b.disc || 0, credit: b.credit || "ok", qbo: b.qbo || null });
    const rows = await query("SELECT * FROM cls.Customer WHERE customer_id = @id", { id });
    return rows[0];
  }),
});

app.http("jobsiteUpsert", {
  methods: ["POST", "PUT"],
  authLevel: "anonymous",
  route: "jobsites/{id?}",
  handler: handler(async (request) => {
    requireRole(request, EDITORS);
    const b = await request.json();
    const id = request.params.id ? Number(request.params.id) : null;
    if (id) {
      await query(`UPDATE cls.Jobsite SET name=@name, customer_id=@cust, county=@county,
                     delivery_zone_fee=@zone, superintendent=@super, active=@active,
                     updated_at=SYSUTCDATETIME() WHERE jobsite_id=@id`,
        { id, name: b.name, cust: b.cust, county: b.county || null,
          zone: b.zone ?? 200, super: b.super || null, active: b.active !== false });
    } else {
      await query(`INSERT cls.Jobsite (name, customer_id, county, delivery_zone_fee, superintendent, active)
                   VALUES (@name, @cust, @county, @zone, @super, @active)`,
        { name: b.name, cust: b.cust, county: b.county || null,
          zone: b.zone ?? 200, super: b.super || null, active: b.active !== false });
    }
    const rows = await query("SELECT * FROM cls.Jobsite WHERE name = @name", { name: b.name });
    return rows[0];
  }),
});
