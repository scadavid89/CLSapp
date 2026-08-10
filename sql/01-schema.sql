/* =====================================================================
   Contractor Leasing Solutions — schema
   Azure SQL Database. Idempotent: safe to run more than once.
   ===================================================================== */

IF SCHEMA_ID('cls') IS NULL EXEC('CREATE SCHEMA cls');
GO

/* ---------- reference ---------- */

IF OBJECT_ID('cls.Config','U') IS NULL
CREATE TABLE cls.Config (
  [key]         VARCHAR(64)    NOT NULL PRIMARY KEY,
  [value]       DECIMAL(10,4)  NOT NULL,
  description   NVARCHAR(200)  NULL
);
GO

IF OBJECT_ID('cls.CountySurtax','U') IS NULL
CREATE TABLE cls.CountySurtax (
  county        NVARCHAR(60)   NOT NULL PRIMARY KEY,
  surtax_pct    DECIMAL(5,3)   NOT NULL
);
GO

/* ---------- catalog ----------
   The model owns what is true of every unit: name, description, rate card,
   unit ladder. The asset owns what is true of one purchase. */

IF OBJECT_ID('cls.Product','U') IS NULL
CREATE TABLE cls.Product (
  sku                 VARCHAR(24)    NOT NULL PRIMARY KEY,
  name                NVARCHAR(120)  NOT NULL,
  description         NVARCHAR(600)  NULL,
  category            NVARCHAR(40)   NOT NULL,
  serialized          BIT            NOT NULL,
  has_meter           BIT            NOT NULL CONSTRAINT DF_Product_meter DEFAULT 0,
  default_cost        DECIMAL(12,2)  NOT NULL,
  useful_life_months  INT            NOT NULL,
  salvage_default     DECIMAL(12,2)  NOT NULL,
  rate_day            DECIMAL(12,2)  NOT NULL CONSTRAINT DF_Product_rd DEFAULT 0,
  rate_week           DECIMAL(12,2)  NOT NULL CONSTRAINT DF_Product_rw DEFAULT 0,
  rate_month          DECIMAL(12,2)  NOT NULL CONSTRAINT DF_Product_rm DEFAULT 0,
  active              BIT            NOT NULL CONSTRAINT DF_Product_active DEFAULT 1,
  updated_at          DATETIME2      NOT NULL CONSTRAINT DF_Product_upd DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_Product_life CHECK (useful_life_months > 0),
  CONSTRAINT CK_Product_rate CHECK (rate_day > 0 OR rate_week > 0 OR rate_month > 0)
);
GO

/* Base unit is level 1 with base_qty 1. Stock always moves in base units;
   the ladder is a pricing and presentation layer only. */
IF OBJECT_ID('cls.ProductUom','U') IS NULL
CREATE TABLE cls.ProductUom (
  sku         VARCHAR(24)   NOT NULL,
  [level]     TINYINT       NOT NULL,
  name        NVARCHAR(40)  NOT NULL,
  base_qty    INT           NOT NULL,
  CONSTRAINT PK_ProductUom PRIMARY KEY (sku, [level]),
  CONSTRAINT FK_ProductUom_Product FOREIGN KEY (sku) REFERENCES cls.Product(sku) ON DELETE CASCADE,
  CONSTRAINT CK_ProductUom_qty CHECK (base_qty >= 1)
);
GO

/* ---------- directory ---------- */

IF OBJECT_ID('cls.Customer','U') IS NULL
CREATE TABLE cls.Customer (
  customer_id       VARCHAR(16)    NOT NULL PRIMARY KEY,
  name              NVARCHAR(160)  NOT NULL,
  contact           NVARCHAR(120)  NULL,
  phone             NVARCHAR(40)   NULL,
  city              NVARCHAR(80)   NULL,
  terms             NVARCHAR(40)   NOT NULL CONSTRAINT DF_Cust_terms DEFAULT 'Net 30',
  default_discount  DECIMAL(5,2)   NOT NULL CONSTRAINT DF_Cust_disc DEFAULT 0,
  credit_status     VARCHAR(10)    NOT NULL CONSTRAINT DF_Cust_credit DEFAULT 'ok',
  qbo_customer_id   NVARCHAR(40)   NULL,
  updated_at        DATETIME2      NOT NULL CONSTRAINT DF_Cust_upd DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_Cust_credit CHECK (credit_status IN ('ok','hold')),
  CONSTRAINT CK_Cust_disc CHECK (default_discount BETWEEN 0 AND 45)
);
GO

/* county drives the discretionary surtax, delivery_zone_fee drives freight.
   Neither belongs on Customer: a Tampa GC building in Orange County pays
   Orange County's rate and a longer haul. */
IF OBJECT_ID('cls.Jobsite','U') IS NULL
CREATE TABLE cls.Jobsite (
  jobsite_id        INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  name              NVARCHAR(160)  NOT NULL UNIQUE,
  customer_id       VARCHAR(16)    NOT NULL,
  county            NVARCHAR(60)   NULL,
  delivery_zone_fee DECIMAL(10,2)  NOT NULL CONSTRAINT DF_Site_zone DEFAULT 200,
  superintendent    NVARCHAR(120)  NULL,
  active            BIT            NOT NULL CONSTRAINT DF_Site_active DEFAULT 1,
  updated_at        DATETIME2      NOT NULL CONSTRAINT DF_Site_upd DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Jobsite_Customer FOREIGN KEY (customer_id) REFERENCES cls.Customer(customer_id)
);
GO
IF INDEXPROPERTY(OBJECT_ID('cls.Jobsite'), 'IX_Jobsite_customer', 'IndexID') IS NULL
  CREATE INDEX IX_Jobsite_customer ON cls.Jobsite(customer_id) WHERE active = 1;
GO

/* ---------- fleet ---------- */

IF OBJECT_ID('cls.Asset','U') IS NULL
CREATE TABLE cls.Asset (
  asset_id            VARCHAR(48)    NOT NULL PRIMARY KEY,
  tag                 VARCHAR(24)    NOT NULL UNIQUE,
  sku                 VARCHAR(24)    NOT NULL,
  serial_no           NVARCHAR(80)   NULL,
  acquisition_cost    DECIMAL(12,2)  NOT NULL,
  useful_life_months  INT            NOT NULL,
  salvage_value       DECIMAL(12,2)  NOT NULL,
  in_service_date     DATE           NOT NULL,
  status              NVARCHAR(20)   NOT NULL,
  condition           NVARCHAR(20)   NOT NULL CONSTRAINT DF_Asset_cond DEFAULT 'Good',
  yard_bin            NVARCHAR(40)   NULL,
  meter_hours         INT            NULL,
  customer_id         VARCHAR(16)    NULL,
  jobsite_id          INT            NULL,
  term                VARCHAR(8)     NULL,
  rental_start        DATE           NULL,
  expected_return     DATE           NULL,
  ltd_revenue         DECIMAL(14,2)  NOT NULL CONSTRAINT DF_Asset_ltd DEFAULT 0,
  disposed_date       DATE           NULL,
  disposal_proceeds   DECIMAL(12,2)  NULL,
  updated_at          DATETIME2      NOT NULL CONSTRAINT DF_Asset_upd DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Asset_Product  FOREIGN KEY (sku) REFERENCES cls.Product(sku),
  CONSTRAINT FK_Asset_Customer FOREIGN KEY (customer_id) REFERENCES cls.Customer(customer_id),
  CONSTRAINT FK_Asset_Jobsite  FOREIGN KEY (jobsite_id) REFERENCES cls.Jobsite(jobsite_id),
  CONSTRAINT CK_Asset_status CHECK (status IN ('Available','On rent','In service','In transit','Disposed')),
  CONSTRAINT CK_Asset_term   CHECK (term IS NULL OR term IN ('day','week','month')),
  /* on rent means it is somewhere, with a date to come back */
  CONSTRAINT CK_Asset_deployed CHECK (
    status <> 'On rent' OR (jobsite_id IS NOT NULL AND rental_start IS NOT NULL AND expected_return IS NOT NULL))
);
GO
IF INDEXPROPERTY(OBJECT_ID('cls.Asset'), 'IX_Asset_sku_status', 'IndexID') IS NULL
  CREATE INDEX IX_Asset_sku_status ON cls.Asset(sku, status) INCLUDE (rental_start, expected_return);
GO
IF INDEXPROPERTY(OBJECT_ID('cls.Asset'), 'IX_Asset_window', 'IndexID') IS NULL
  CREATE INDEX IX_Asset_window ON cls.Asset(sku, rental_start, expected_return);
GO
IF INDEXPROPERTY(OBJECT_ID('cls.Asset'), 'IX_Asset_jobsite', 'IndexID') IS NULL
  CREATE INDEX IX_Asset_jobsite ON cls.Asset(jobsite_id) WHERE status = 'On rent';
GO

/* Non-serialized stock. Always counted in base units. */
IF OBJECT_ID('cls.StockPool','U') IS NULL
CREATE TABLE cls.StockPool (
  sku                 VARCHAR(24)    NOT NULL PRIMARY KEY,
  qty_total           INT            NOT NULL,
  qty_on_rent         INT            NOT NULL CONSTRAINT DF_Pool_onrent DEFAULT 0,
  qty_service         INT            NOT NULL CONSTRAINT DF_Pool_svc DEFAULT 0,
  unit_cost           DECIMAL(12,2)  NOT NULL,
  useful_life_months  INT            NOT NULL,
  salvage_value       DECIMAL(12,2)  NOT NULL,
  in_service_date     DATE           NOT NULL,
  yard_bin            NVARCHAR(40)   NULL,
  ltd_revenue         DECIMAL(14,2)  NOT NULL CONSTRAINT DF_Pool_ltd DEFAULT 0,
  updated_at          DATETIME2      NOT NULL CONSTRAINT DF_Pool_upd DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Pool_Product FOREIGN KEY (sku) REFERENCES cls.Product(sku),
  CONSTRAINT CK_Pool_counts CHECK (qty_on_rent >= 0 AND qty_service >= 0 AND qty_on_rent + qty_service <= qty_total)
);
GO

/* qty_available is derived, never stored — one source of truth */
IF OBJECT_ID('cls.vStockPool','V') IS NOT NULL DROP VIEW cls.vStockPool;
GO
CREATE VIEW cls.vStockPool AS
  SELECT *, qty_total - qty_on_rent - qty_service AS qty_available FROM cls.StockPool;
GO

/* ---------- quoting ---------- */

IF OBJECT_ID('cls.Quote','U') IS NULL
CREATE TABLE cls.Quote (
  quote_id      VARCHAR(24)    NOT NULL PRIMARY KEY,
  customer_id   VARCHAR(16)    NOT NULL,
  jobsite_id    INT            NOT NULL,
  status        NVARCHAR(20)   NOT NULL CONSTRAINT DF_Quote_status DEFAULT 'Draft',
  po_number     NVARCHAR(60)   NULL,
  waiver        BIT            NOT NULL CONSTRAINT DF_Quote_waiver DEFAULT 1,
  delivery      BIT            NOT NULL CONSTRAINT DF_Quote_delivery DEFAULT 1,
  window_start  DATE           NOT NULL,
  window_end    DATE           NOT NULL,
  created_at    DATE           NOT NULL CONSTRAINT DF_Quote_created DEFAULT CAST(SYSUTCDATETIME() AS DATE),
  expires_at    DATE           NOT NULL,
  dispatched_at DATE           NULL,
  lost_reason   NVARCHAR(60)   NULL,
  posted_qbo    BIT            NOT NULL CONSTRAINT DF_Quote_posted DEFAULT 0,
  qbo_estimate_id NVARCHAR(40) NULL,
  prepared_by   NVARCHAR(120)  NULL,
  updated_at    DATETIME2      NOT NULL CONSTRAINT DF_Quote_upd DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Quote_Customer FOREIGN KEY (customer_id) REFERENCES cls.Customer(customer_id),
  CONSTRAINT FK_Quote_Jobsite  FOREIGN KEY (jobsite_id) REFERENCES cls.Jobsite(jobsite_id),
  CONSTRAINT CK_Quote_status CHECK (status IN ('Draft','Sent','Accepted','Dispatched','On rent','Returned','Lost','Expired')),
  CONSTRAINT CK_Quote_window CHECK (window_end >= window_start)
);
GO
IF INDEXPROPERTY(OBJECT_ID('cls.Quote'), 'IX_Quote_status', 'IndexID') IS NULL
  CREATE INDEX IX_Quote_status ON cls.Quote(status, expires_at);
GO

IF OBJECT_ID('cls.QuoteLine','U') IS NULL
CREATE TABLE cls.QuoteLine (
  line_id       INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  quote_id      VARCHAR(24)   NOT NULL,
  line_no       INT           NOT NULL,
  sku           VARCHAR(24)   NOT NULL,
  qty           INT           NOT NULL,
  uom_level     TINYINT       NOT NULL CONSTRAINT DF_QL_uom DEFAULT 1,
  start_date    DATE          NOT NULL,
  end_date      DATE          NOT NULL,
  discount_pct  DECIMAL(5,2)  NOT NULL CONSTRAINT DF_QL_disc DEFAULT 0,
  /* the price as quoted is frozen here at send; the rate card may move */
  frozen_rate_day   DECIMAL(12,2) NULL,
  frozen_rate_week  DECIMAL(12,2) NULL,
  frozen_rate_month DECIMAL(12,2) NULL,
  CONSTRAINT FK_QL_Quote   FOREIGN KEY (quote_id) REFERENCES cls.Quote(quote_id) ON DELETE CASCADE,
  CONSTRAINT FK_QL_Product FOREIGN KEY (sku) REFERENCES cls.Product(sku),
  CONSTRAINT CK_QL_qty CHECK (qty >= 1),
  CONSTRAINT CK_QL_dates CHECK (end_date >= start_date)
);
GO
IF INDEXPROPERTY(OBJECT_ID('cls.QuoteLine'), 'IX_QL_sku_window', 'IndexID') IS NULL
  CREATE INDEX IX_QL_sku_window ON cls.QuoteLine(sku, start_date, end_date) INCLUDE (quote_id, qty, uom_level);
GO

/* What actually went out and what came back. Direction OUT rows are the
   packing list; IN rows are the return receipt. */
IF OBJECT_ID('cls.Fulfillment','U') IS NULL
CREATE TABLE cls.Fulfillment (
  fulfillment_id  INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  quote_id        VARCHAR(24)   NULL,
  jobsite_id      INT           NULL,
  direction       VARCHAR(3)    NOT NULL,
  confirmed_by    NVARCHAR(120) NULL,
  confirmed_at    DATETIME2     NOT NULL CONSTRAINT DF_Ful_at DEFAULT SYSUTCDATETIME(),
  document_url    NVARCHAR(400) NULL,
  note            NVARCHAR(400) NULL,
  CONSTRAINT FK_Ful_Quote FOREIGN KEY (quote_id) REFERENCES cls.Quote(quote_id),
  CONSTRAINT CK_Ful_dir CHECK (direction IN ('OUT','IN'))
);
GO

IF OBJECT_ID('cls.FulfillmentLine','U') IS NULL
CREATE TABLE cls.FulfillmentLine (
  fulfillment_id  INT          NOT NULL,
  tag             VARCHAR(24)  NULL,
  sku             VARCHAR(24)  NULL,
  qty_base        INT          NOT NULL CONSTRAINT DF_FL_qty DEFAULT 1,
  CONSTRAINT FK_FL_Ful FOREIGN KEY (fulfillment_id) REFERENCES cls.Fulfillment(fulfillment_id) ON DELETE CASCADE
);
GO
IF INDEXPROPERTY(OBJECT_ID('cls.FulfillmentLine'), 'IX_FL_tag', 'IndexID') IS NULL
  CREATE INDEX IX_FL_tag ON cls.FulfillmentLine(tag);
GO

/* ---------- movement: append-only, the source of truth for where things are ---------- */

IF OBJECT_ID('cls.Movement','U') IS NULL
CREATE TABLE cls.Movement (
  movement_id   BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  tag           VARCHAR(24)   NULL,
  sku           VARCHAR(24)   NULL,
  qty_base      INT           NOT NULL CONSTRAINT DF_Mov_qty DEFAULT 1,
  movement_type VARCHAR(16)   NOT NULL,
  quote_id      VARCHAR(24)   NULL,
  jobsite_id    INT           NULL,
  meter_reading INT           NULL,
  user_upn      NVARCHAR(160) NOT NULL,
  occurred_at   DATETIME2     NOT NULL CONSTRAINT DF_Mov_at DEFAULT SYSUTCDATETIME(),
  note          NVARCHAR(400) NULL,
  CONSTRAINT CK_Mov_type CHECK (movement_type IN
    ('CHECKOUT','CHECKIN','TRANSFER','SERVICE_IN','SERVICE_OUT','LOST','DAMAGED','ADJUST','RECEIVE','DISPOSE'))
);
GO
IF INDEXPROPERTY(OBJECT_ID('cls.Movement'), 'IX_Mov_tag_at', 'IndexID') IS NULL
  CREATE INDEX IX_Mov_tag_at ON cls.Movement(tag, occurred_at DESC);
GO
IF INDEXPROPERTY(OBJECT_ID('cls.Movement'), 'IX_Mov_at', 'IndexID') IS NULL
  CREATE INDEX IX_Mov_at ON cls.Movement(occurred_at DESC);
GO

/* ---------- who can do what ---------- */

IF OBJECT_ID('cls.AppUser','U') IS NULL
CREATE TABLE cls.AppUser (
  user_id       INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  provider      NVARCHAR(40)  NOT NULL,
  subject_id    NVARCHAR(200) NOT NULL,
  email         NVARCHAR(200) NULL,
  display_name  NVARCHAR(160) NULL,
  role          VARCHAR(20)   NOT NULL,
  customer_id   VARCHAR(16)   NULL,
  invited_by    NVARCHAR(160) NULL,
  invited_at    DATETIME2     NULL,
  last_seen_at  DATETIME2     NULL,
  disabled_at   DATETIME2     NULL,
  CONSTRAINT UQ_AppUser UNIQUE (provider, subject_id),
  CONSTRAINT FK_AppUser_Customer FOREIGN KEY (customer_id) REFERENCES cls.Customer(customer_id),
  CONSTRAINT CK_AppUser_role CHECK (role IN ('yard','dispatch','ops','finance','customer','admin')),
  /* a customer-scoped user must actually be scoped */
  CONSTRAINT CK_AppUser_scope CHECK (role <> 'customer' OR customer_id IS NOT NULL)
);
GO

/* ---------- depreciation ---------- */

IF OBJECT_ID('cls.DepreciationRun','U') IS NULL
CREATE TABLE cls.DepreciationRun (
  run_id      INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  period      CHAR(7)        NOT NULL UNIQUE,     -- YYYY-MM
  method      VARCHAR(20)    NOT NULL CONSTRAINT DF_Run_method DEFAULT 'straight-line',
  total_amount DECIMAL(14,2) NOT NULL,
  qbo_je_id   NVARCHAR(40)   NULL,
  posted_at   DATETIME2      NULL,
  created_at  DATETIME2      NOT NULL CONSTRAINT DF_Run_created DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('cls.DepreciationLine','U') IS NULL
CREATE TABLE cls.DepreciationLine (
  run_id            INT           NOT NULL,
  asset_id          VARCHAR(48)   NULL,
  sku               VARCHAR(24)   NULL,
  amount            DECIMAL(12,2) NOT NULL,
  accumulated_after DECIMAL(14,2) NOT NULL,
  nbv_after         DECIMAL(14,2) NOT NULL,
  CONSTRAINT FK_DL_Run FOREIGN KEY (run_id) REFERENCES cls.DepreciationRun(run_id) ON DELETE CASCADE
);
GO
