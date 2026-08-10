/* =====================================================================
   Availability — the query the whole business runs on.

   Availability is a WINDOW question, not a stock count. A count of what is
   on the shelf today will promise a unit that goes out again mid-window,
   and hide the four coming back before the customer needs them.

   free(sku, start, end) =
        total units
      - units whose rental window OVERLAPS [start, end]
      - units held for service
      - quantity soft-held by live quotes overlapping [start, end]

   Two intervals overlap when  aStart <= bEnd AND bStart <= aEnd.
   ===================================================================== */

IF OBJECT_ID('cls.fnAvailability','IF') IS NOT NULL DROP FUNCTION cls.fnAvailability;
GO

CREATE FUNCTION cls.fnAvailability
(
  @sku          VARCHAR(24),
  @start        DATE,
  @end          DATE,
  @exclude_quote VARCHAR(24) = NULL   -- a quote never blocks itself
)
RETURNS TABLE
AS
RETURN
WITH p AS (
  SELECT sku, serialized FROM cls.Product WHERE sku = @sku
),
held AS (   /* soft holds from live quotes, converted to base units */
  SELECT ISNULL(SUM(ql.qty * ISNULL(u.base_qty, 1)), 0) AS qty
  FROM cls.QuoteLine ql
  JOIN cls.Quote q ON q.quote_id = ql.quote_id
  LEFT JOIN cls.ProductUom u ON u.sku = ql.sku AND u.[level] = ql.uom_level
  WHERE ql.sku = @sku
    AND q.status IN ('Sent','Accepted')
    AND q.expires_at >= CAST(SYSUTCDATETIME() AS DATE)
    AND (@exclude_quote IS NULL OR q.quote_id <> @exclude_quote)
    AND ql.start_date <= @end AND @start <= ql.end_date
),
ser AS (    /* serialized: count units whose commitments overlap the window */
  SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN a.status = 'In service' THEN 1
             WHEN a.expected_return IS NOT NULL
              AND ISNULL(a.rental_start, @start) <= @end
              AND @start <= a.expected_return THEN 1
             ELSE 0 END) AS blocked,
    MIN(CASE WHEN a.expected_return IS NOT NULL
              AND ISNULL(a.rental_start, @start) <= @end
              AND @start <= a.expected_return THEN a.expected_return END) AS next_free
  FROM cls.Asset a
  WHERE a.sku = @sku AND a.status <> 'Disposed'
),
pool AS (
  SELECT qty_total AS total, qty_on_rent + qty_service AS blocked
  FROM cls.StockPool WHERE sku = @sku
)
SELECT
  @sku AS sku,
  CASE WHEN p.serialized = 1 THEN ISNULL(ser.total, 0) ELSE ISNULL(pool.total, 0) END AS total_units,
  held.qty AS qty_held,
  CASE WHEN p.serialized = 1
       THEN CASE WHEN ISNULL(ser.total,0) - ISNULL(ser.blocked,0) - held.qty < 0 THEN 0
                 ELSE ISNULL(ser.total,0) - ISNULL(ser.blocked,0) - held.qty END
       ELSE CASE WHEN ISNULL(pool.total,0) - ISNULL(pool.blocked,0) - held.qty < 0 THEN 0
                 ELSE ISNULL(pool.total,0) - ISNULL(pool.blocked,0) - held.qty END
  END AS qty_free,
  /* when the answer is "not enough", the follow-up question is always "when?" */
  CASE WHEN p.serialized = 1 THEN ser.next_free ELSE NULL END AS next_free_date,
  p.serialized
FROM p
CROSS JOIN held
LEFT JOIN ser  ON p.serialized = 1
LEFT JOIN pool ON p.serialized = 0;
GO

/* Whole-catalog availability for a window — what the quote picker calls. */
IF OBJECT_ID('cls.spAvailabilityAll','P') IS NOT NULL DROP PROCEDURE cls.spAvailabilityAll;
GO
CREATE PROCEDURE cls.spAvailabilityAll
  @start DATE, @end DATE, @exclude_quote VARCHAR(24) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SELECT p.sku, p.name, p.category, a.total_units, a.qty_held, a.qty_free, a.next_free_date, a.serialized
  FROM cls.Product p
  CROSS APPLY cls.fnAvailability(p.sku, @start, @end, @exclude_quote) a
  WHERE p.active = 1
  ORDER BY p.category, p.sku;
END
GO

/* ---------------------------------------------------------------------
   Check-out. Assigns tags to an order, flips assets on rent, writes the
   packing list and one movement per unit — all or nothing.
   --------------------------------------------------------------------- */
IF OBJECT_ID('cls.spCheckOut','P') IS NOT NULL DROP PROCEDURE cls.spCheckOut;
GO
CREATE PROCEDURE cls.spCheckOut
  @quote_id VARCHAR(24),
  @tags     NVARCHAR(MAX),      -- JSON array of tag strings
  @user     NVARCHAR(160)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  BEGIN TRAN;

    DECLARE @jobsite INT, @customer VARCHAR(16), @wstart DATE, @wend DATE, @days INT, @term VARCHAR(8);
    SELECT @jobsite = jobsite_id, @customer = customer_id, @wstart = window_start, @wend = window_end
    FROM cls.Quote WHERE quote_id = @quote_id;

    IF @jobsite IS NULL THROW 50010, 'Quote not found', 1;

    SET @days = DATEDIFF(DAY, @wstart, @wend);
    SET @term = CASE WHEN @days >= 28 THEN 'month' WHEN @days >= 7 THEN 'week' ELSE 'day' END;

    DECLARE @t TABLE (tag VARCHAR(24));
    INSERT @t (tag) SELECT [value] FROM OPENJSON(@tags);

    /* refuse the whole load if any unit is not actually in the yard */
    IF EXISTS (SELECT 1 FROM cls.Asset a JOIN @t t ON t.tag = a.tag WHERE a.status <> 'Available')
      THROW 50011, 'One or more units are not available', 1;

    UPDATE a SET
      status = 'On rent', customer_id = @customer, jobsite_id = @jobsite,
      term = @term, rental_start = CAST(SYSUTCDATETIME() AS DATE), expected_return = @wend,
      updated_at = SYSUTCDATETIME()
    FROM cls.Asset a JOIN @t t ON t.tag = a.tag;

    DECLARE @ful INT;
    INSERT cls.Fulfillment (quote_id, jobsite_id, direction, confirmed_by)
      VALUES (@quote_id, @jobsite, 'OUT', @user);
    SET @ful = SCOPE_IDENTITY();

    INSERT cls.FulfillmentLine (fulfillment_id, tag, sku, qty_base)
      SELECT @ful, a.tag, a.sku, 1 FROM cls.Asset a JOIN @t t ON t.tag = a.tag;

    INSERT cls.Movement (tag, sku, movement_type, quote_id, jobsite_id, meter_reading, user_upn, note)
      SELECT a.tag, a.sku, 'CHECKOUT', @quote_id, @jobsite, a.meter_hours, @user, 'Load confirmed'
      FROM cls.Asset a JOIN @t t ON t.tag = a.tag;

    UPDATE cls.Quote SET status = 'Dispatched', dispatched_at = CAST(SYSUTCDATETIME() AS DATE),
      updated_at = SYSUTCDATETIME() WHERE quote_id = @quote_id;

  COMMIT;
  SELECT @ful AS fulfillment_id;
END
GO

/* ---------------------------------------------------------------------
   Check-in. Driven by the project, not the order: a truck coming back can
   carry units from several orders or none. Each tag is reconciled against
   whichever contract it actually belongs to. Partial returns are normal.
   --------------------------------------------------------------------- */
IF OBJECT_ID('cls.spCheckIn','P') IS NOT NULL DROP PROCEDURE cls.spCheckIn;
GO
CREATE PROCEDURE cls.spCheckIn
  @jobsite_id INT,
  @tags       NVARCHAR(MAX),
  @user       NVARCHAR(160),
  @to_service BIT = 0
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  BEGIN TRAN;

    DECLARE @t TABLE (tag VARCHAR(24));
    INSERT @t (tag) SELECT [value] FROM OPENJSON(@tags);

    IF EXISTS (SELECT 1 FROM cls.Asset a JOIN @t t ON t.tag = a.tag
               WHERE a.status = 'Available')
      THROW 50020, 'One or more units are already in the yard', 1;

    DECLARE @ful INT;
    INSERT cls.Fulfillment (jobsite_id, direction, confirmed_by) VALUES (@jobsite_id, 'IN', @user);
    SET @ful = SCOPE_IDENTITY();

    INSERT cls.FulfillmentLine (fulfillment_id, tag, sku, qty_base)
      SELECT @ful, a.tag, a.sku, 1 FROM cls.Asset a JOIN @t t ON t.tag = a.tag;

    INSERT cls.Movement (tag, sku, movement_type, jobsite_id, meter_reading, user_upn, note)
      SELECT a.tag, a.sku, CASE WHEN @to_service = 1 THEN 'SERVICE_IN' ELSE 'CHECKIN' END,
             a.jobsite_id, a.meter_hours, @user, 'Return confirmed'
      FROM cls.Asset a JOIN @t t ON t.tag = a.tag;

    UPDATE a SET
      status = CASE WHEN @to_service = 1 THEN 'In service' ELSE 'Available' END,
      customer_id = NULL, jobsite_id = NULL, term = NULL,
      rental_start = NULL, expected_return = NULL, updated_at = SYSUTCDATETIME()
    FROM cls.Asset a JOIN @t t ON t.tag = a.tag;

    /* close any order whose last unit just came back */
    UPDATE q SET status = 'Returned', updated_at = SYSUTCDATETIME()
    FROM cls.Quote q
    WHERE q.status IN ('Dispatched','On rent')
      AND NOT EXISTS (
        SELECT 1 FROM cls.Fulfillment f
        JOIN cls.FulfillmentLine fl ON fl.fulfillment_id = f.fulfillment_id
        JOIN cls.Asset a ON a.tag = fl.tag
        WHERE f.quote_id = q.quote_id AND f.direction = 'OUT' AND a.status = 'On rent');

  COMMIT;
  SELECT @ful AS fulfillment_id;
END
GO

/* ---------------------------------------------------------------------
   Expire stale quotes and release their holds. Run nightly.
   Without this, availability becomes fiction within a quarter as dead
   quotes accumulate phantom commitments.
   --------------------------------------------------------------------- */
IF OBJECT_ID('cls.spExpireQuotes','P') IS NOT NULL DROP PROCEDURE cls.spExpireQuotes;
GO
CREATE PROCEDURE cls.spExpireQuotes AS
BEGIN
  SET NOCOUNT ON;
  UPDATE cls.Quote SET status = 'Expired', updated_at = SYSUTCDATETIME()
  WHERE status = 'Sent' AND expires_at < CAST(SYSUTCDATETIME() AS DATE);
  SELECT @@ROWCOUNT AS expired;
END
GO

/* ---------------------------------------------------------------------
   Monthly book depreciation. Straight-line, prorated from in-service,
   floored at salvage. Book basis only — tax is a separate schedule.
   --------------------------------------------------------------------- */
IF OBJECT_ID('cls.spDepreciationRun','P') IS NOT NULL DROP PROCEDURE cls.spDepreciationRun;
GO
CREATE PROCEDURE cls.spDepreciationRun @period CHAR(7) AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF EXISTS (SELECT 1 FROM cls.DepreciationRun WHERE period = @period)
    THROW 50030, 'That period has already been run', 1;

  DECLARE @asof DATE = DATEFROMPARTS(LEFT(@period,4), RIGHT(@period,2), 1);
  BEGIN TRAN;

    DECLARE @run INT;
    INSERT cls.DepreciationRun (period, total_amount) VALUES (@period, 0);
    SET @run = SCOPE_IDENTITY();

    ;WITH calc AS (
      SELECT a.asset_id, a.sku,
        (a.acquisition_cost - a.salvage_value) / a.useful_life_months AS per_month,
        CASE WHEN DATEDIFF(MONTH, a.in_service_date, @asof) < 0 THEN 0
             WHEN DATEDIFF(MONTH, a.in_service_date, @asof) > a.useful_life_months THEN a.useful_life_months
             ELSE DATEDIFF(MONTH, a.in_service_date, @asof) END AS elapsed,
        a.acquisition_cost, a.salvage_value
      FROM cls.Asset a WHERE a.disposed_date IS NULL
    )
    INSERT cls.DepreciationLine (run_id, asset_id, sku, amount, accumulated_after, nbv_after)
    SELECT @run, asset_id, sku,
      CASE WHEN elapsed = 0 THEN 0 ELSE per_month END,
      per_month * elapsed,
      acquisition_cost - (per_month * elapsed)
    FROM calc;

    UPDATE cls.DepreciationRun
      SET total_amount = (SELECT SUM(amount) FROM cls.DepreciationLine WHERE run_id = @run)
    WHERE run_id = @run;

  COMMIT;
  SELECT * FROM cls.DepreciationRun WHERE run_id = @run;
END
GO
