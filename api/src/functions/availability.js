import { app } from "@azure/functions";
import { query, proc } from "../../shared/db.js";
import { handler, requireRole } from "../../shared/auth.js";

const QUOTERS = ["dispatch", "ops", "finance", "admin"];

/* Availability is answered by the database, not the browser. The client
   holds a snapshot from page load; by the time someone finishes building a
   quote, another desk may have taken the last two lifts. */
app.http("availability", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "availability",
  handler: handler(async (request) => {
    requireRole(request, QUOTERS);
    const u = new URL(request.url);
    const start = u.searchParams.get("start");
    const end = u.searchParams.get("end");
    const sku = u.searchParams.get("sku");
    const exclude = u.searchParams.get("excludeQuote") || null;
    if (!start || !end) throw Object.assign(new Error("start and end are required"), { status: 400 });

    if (sku) {
      const rows = await query(
        "SELECT * FROM cls.fnAvailability(@sku, @start, @end, @ex)",
        { sku, start, end, ex: exclude });
      return rows[0] || null;
    }
    return proc("cls.spAvailabilityAll", { start, end, exclude_quote: exclude });
  }),
});
