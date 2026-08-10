/* =====================================================================
   Seed data. Idempotent — MERGE, so re-running updates rather than
   duplicating. Replace with your real catalog and customers; these are
   illustrative figures carried over from the prototype.
   ===================================================================== */
SET NOCOUNT ON;
GO

/* ---------- config ---------- */
MERGE cls.Config AS t USING (VALUES
  (N'state_tax_pct',6,N'Florida state sales tax'),
  (N'damage_waiver_pct',12,N'Damage waiver, % of rental'),
  (N'environmental_pct',2.5,N'Environmental / fuel fee, % of rental'),
  (N'approval_threshold_pct',15,N'Discount above this needs Ops release'),
  (N'deposit_pct',25,N'Deposit at signing, % of total'),
  (N'quote_hold_days',14,N'Days a sent quote holds inventory'),
  (N'rate_floor_multiple',1.8,N'28-day rate must clear monthly depreciation x this')
) AS s([key],[value],description) ON t.[key]=s.[key]
WHEN MATCHED THEN UPDATE SET [value]=s.[value], description=s.description
WHEN NOT MATCHED THEN INSERT([key],[value],description) VALUES(s.[key],s.[value],s.description);
GO

/* ---------- county surtax (verify against DR-15DSS before go-live) ---------- */
MERGE cls.CountySurtax AS t USING (VALUES
  (N'Hillsborough',1.5),
  (N'Pinellas',1),
  (N'Orange',0.5),
  (N'Manatee',1),
  (N'Polk',1.5),
  (N'Duval',1.5)
) AS s(county,surtax_pct) ON t.county=s.county
WHEN MATCHED THEN UPDATE SET surtax_pct=s.surtax_pct
WHEN NOT MATCHED THEN INSERT(county,surtax_pct) VALUES(s.county,s.surtax_pct);
GO

/* ---------- products ---------- */
MERGE cls.Product AS t USING (VALUES
  (N'SCL-1930',N'Scissor Lift 19ft Electric',N'19 ft working height on a 30 in deck, non-marking tires. Fits a standard doorway and a passenger elevator.',N'Equipment',1,1,18500,84,4200,145,425,1150),
  (N'GEN-25K',N'Towable Generator 25kW',N'25 kW towable diesel, 120/240V single and three phase. 60-gallon tank runs about 24 hours at half load.',N'Equipment',1,1,22400,96,5000,225,675,1875),
  (N'LTW-4H',N'Light Tower 4-Head Diesel',N'Four heads on a 30 ft mast, towable, roughly 60 run hours per fill.',N'Equipment',1,1,9800,84,1800,95,285,760),
  (N'ACP-5T',N'Portable AC 5-Ton Spot Cooler',N'5-ton portable spot cooler, 60,000 BTU, ducted supply and return. 208V single phase.',N'Equipment',1,0,7600,72,900,135,405,1080),
  (N'DHU-150',N'Dehumidifier 150 PPD',N'150 pints per day low-grain refrigerant unit for slab dry-down and post-flood work.',N'Equipment',1,0,3400,60,400,75,225,600),
  (N'PDU-100',N'Temp Power Distro 100A',N'100A temporary distribution, main breaker with GFCI-protected 120V and 240V outlets.',N'Equipment',1,0,4100,96,600,60,180,480),
  (N'TRL-824',N'Job Trailer 8x24 Office',N'8 x 24 ft office trailer, two rooms, HVAC, steps and skirting included. Set and knockdown quoted separately.',N'Structures',1,0,32000,120,9500,0,0,875),
  (N'CON-20S',N'Storage Container 20ft',N'20 ft wind and watertight container, ground level, double doors, lockbox.',N'Structures',1,0,5200,180,1600,0,0,195),
  (N'FNC-612',N'Temp Fence Panel 6x12',N'6 x 12 ft galvanized panel with feet and clamps. Windscreen and gates priced separately.',N'Structures',0,0,78,96,12,0,1.9,4.5),
  (N'CHR-TSK',N'Task Chair Mesh Back',N'Mesh-back task chair, adjustable arms and lumbar. Stacks six to a dolly.',N'Furnishings',0,0,165,60,15,0,8,22),
  (N'TBL-6FT',N'Folding Table 6ft',N'6 ft folding table, laminate top, steel frame. Ten to a bundle.',N'Furnishings',0,0,128,72,10,0,7,18),
  (N'DSK-60J',N'Jobsite Desk 60in Steel',N'60 in steel jobsite desk with a full-width plan drawer and cable pass-through.',N'Furnishings',0,0,420,84,40,0,16,44),
  (N'FIL-4DR',N'Fire File 4-Drawer Lateral',N'Four-drawer lateral file, one-hour fire rating, key lock.',N'Furnishings',0,0,980,120,120,0,24,68),
  (N'PLN-RCK',N'Plan Rack Rolling 12-Arm',N'Rolling plan rack, twelve pivoting arms, holds up to 1,200 sheets.',N'Furnishings',0,0,340,84,30,0,12,33),
  (N'LAP-R15',N'Rugged Laptop 15in',N'15 in semi-rugged laptop, spill-resistant keyboard, docking-ready, imaged to your standard build.',N'Technology',1,0,2400,36,180,45,135,385),
  (N'MON-27C',N'Monitor 27in + Arm',N'27 in 1440p monitor with clamp-mount arm. Ships as a kit of two for dual setups.',N'Technology',1,0,310,48,25,12,32,85),
  (N'PLT-36W',N'Plotter 36in Wide-Format',N'36 in wide-format plotter with stand and catch basket. Media and ink billed at cost.',N'Technology',1,0,6200,48,500,110,330,890),
  (N'WIF-LTE',N'Jobsite Wi-Fi Kit LTE',N'LTE gateway, outdoor access point, PoE injector, weatherproof enclosure.',N'Technology',1,0,1850,36,100,55,165,445),
  (N'PRJ-4KC',N'Conference Projector 4K',N'4K projector, 4,000 lumens, with tripod screen and HDMI run.',N'Technology',1,0,2900,48,200,85,255,690),
  (N'CAM-SIT',N'Site Camera Solar 4G',N'Solar site camera on 4G with time-lapse capture, motion alerts, and a 60-day cloud archive.',N'Technology',1,0,3600,48,250,0,195,520)
) AS s(sku,name,description,category,serialized,has_meter,default_cost,useful_life_months,salvage_default,rate_day,rate_week,rate_month)
ON t.sku=s.sku
WHEN MATCHED THEN UPDATE SET name=s.name, description=s.description, category=s.category,
  serialized=s.serialized, has_meter=s.has_meter, default_cost=s.default_cost,
  useful_life_months=s.useful_life_months, salvage_default=s.salvage_default,
  rate_day=s.rate_day, rate_week=s.rate_week, rate_month=s.rate_month, updated_at=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT(sku,name,description,category,serialized,has_meter,default_cost,useful_life_months,salvage_default,rate_day,rate_week,rate_month)
  VALUES(s.sku,s.name,s.description,s.category,s.serialized,s.has_meter,s.default_cost,s.useful_life_months,s.salvage_default,s.rate_day,s.rate_week,s.rate_month);
GO

/* ---------- unit ladders ---------- */
MERGE cls.ProductUom AS t USING (VALUES
  (N'SCL-1930',1,N'Each',1),
  (N'GEN-25K',1,N'Each',1),
  (N'LTW-4H',1,N'Each',1),
  (N'ACP-5T',1,N'Each',1),
  (N'DHU-150',1,N'Each',1),
  (N'PDU-100',1,N'Each',1),
  (N'TRL-824',1,N'Each',1),
  (N'CON-20S',1,N'Each',1),
  (N'FNC-612',1,N'Panel',1),
  (N'FNC-612',2,N'Bundle',12),
  (N'FNC-612',3,N'Truckload',240),
  (N'CHR-TSK',1,N'Each',1),
  (N'CHR-TSK',2,N'Stack',6),
  (N'CHR-TSK',3,N'Pallet',36),
  (N'TBL-6FT',1,N'Each',1),
  (N'TBL-6FT',2,N'Bundle',10),
  (N'DSK-60J',1,N'Each',1),
  (N'DSK-60J',2,N'Pallet',8),
  (N'FIL-4DR',1,N'Each',1),
  (N'PLN-RCK',1,N'Each',1),
  (N'LAP-R15',1,N'Each',1),
  (N'MON-27C',1,N'Each',1),
  (N'MON-27C',2,N'Kit of 2',2),
  (N'PLT-36W',1,N'Each',1),
  (N'WIF-LTE',1,N'Each',1),
  (N'PRJ-4KC',1,N'Each',1),
  (N'CAM-SIT',1,N'Each',1)
) AS s(sku,[level],name,base_qty) ON t.sku=s.sku AND t.[level]=s.[level]
WHEN MATCHED THEN UPDATE SET name=s.name, base_qty=s.base_qty
WHEN NOT MATCHED THEN INSERT(sku,[level],name,base_qty) VALUES(s.sku,s.[level],s.name,s.base_qty);
GO

/* ---------- contractors ---------- */
MERGE cls.Customer AS t USING (VALUES
  (N'C-101',N'Suncoast Builders Group',N'Tom Whitfield',N'813-555-0142',N'Tampa',N'Net 30',8,N'ok',N'QBO:87'),
  (N'C-102',N'Baycrest Construction',N'J. Okafor',N'727-555-0119',N'St. Petersburg',N'Net 30',5,N'ok',N'QBO:104'),
  (N'C-103',N'Meridian Contracting LLC',N'Renee Salas',N'407-555-0188',N'Orlando',N'Net 45',12,N'ok',N'QBO:119'),
  (N'C-104',N'Gulfstream Industrial',N'Mark Devlin',N'941-555-0173',N'Sarasota',N'Net 30',0,N'ok',N'QBO:66'),
  (N'C-105',N'Palmetto Build Partners',N'Ana Ruiz',N'863-555-0104',N'Lakeland',N'Due on receipt',0,N'hold',NULL),
  (N'C-106',N'Vertex General Contractors',N'Dale Frank',N'904-555-0167',N'Jacksonville',N'Net 30',6,N'ok',N'QBO:141')
) AS s(customer_id,name,contact,phone,city,terms,default_discount,credit_status,qbo_customer_id)
ON t.customer_id=s.customer_id
WHEN MATCHED THEN UPDATE SET name=s.name, contact=s.contact, phone=s.phone, city=s.city,
  terms=s.terms, default_discount=s.default_discount, credit_status=s.credit_status,
  qbo_customer_id=s.qbo_customer_id, updated_at=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT(customer_id,name,contact,phone,city,terms,default_discount,credit_status,qbo_customer_id)
  VALUES(s.customer_id,s.name,s.contact,s.phone,s.city,s.terms,s.default_discount,s.credit_status,s.qbo_customer_id);
GO

/* ---------- jobsites ---------- */
MERGE cls.Jobsite AS t USING (VALUES
  (N'Water Street Tower 3',N'C-101',N'Hillsborough',165,N'R. Kinney',1),
  (N'Ybor Logistics Center',N'C-101',N'Hillsborough',145,N'L. Batiste',1),
  (N'Riverwalk Hotel Ph 2',N'C-102',N'Pinellas',225,N'P. Nunes',1),
  (N'Gandy Medical Pavilion',N'C-102',N'Pinellas',210,N'S. Ortega',1),
  (N'Lake Nona Data Hall B',N'C-103',N'Orange',395,N'K. Mbeki',1),
  (N'I-4 Ultimate Field Office',N'C-103',N'Orange',370,N'C. Vance',1),
  (N'Port Manatee Berth 4',N'C-104',N'Manatee',285,N'H. Cole',1),
  (N'Polk Distribution Center',N'C-105',N'Polk',265,N'B. Yates',1),
  (N'Southbank Mixed-Use',N'C-106',N'Duval',585,N'G. Ifill',0)
) AS s(name,customer_id,county,delivery_zone_fee,superintendent,active) ON t.name=s.name
WHEN MATCHED THEN UPDATE SET customer_id=s.customer_id, county=s.county,
  delivery_zone_fee=s.delivery_zone_fee, superintendent=s.superintendent, active=s.active, updated_at=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT(name,customer_id,county,delivery_zone_fee,superintendent,active)
  VALUES(s.name,s.customer_id,s.county,s.delivery_zone_fee,s.superintendent,s.active);
GO

/* ---------- serialized assets ---------- */
MERGE cls.Asset AS t USING (VALUES
  (N'SCL-1930-1',N'FL-5556',N'SCL-1930',18500,84,4200,N'2023-12-12',N'Available',N'Good',N'Row E-7',917,NULL,NULL,NULL,NULL,NULL),
  (N'SCL-1930-2',N'FL-1413',N'SCL-1930',18500,84,4200,N'2023-08-12',N'In service',N'Good',N'Row D-8',2598,NULL,NULL,NULL,NULL,NULL),
  (N'SCL-1930-3',N'FL-8794',N'SCL-1930',18500,84,4200,N'2022-08-12',N'Available',N'Fair',N'Row C-5',1605,NULL,NULL,NULL,NULL,NULL),
  (N'SCL-1930-4',N'FL-9699',N'SCL-1930',18500,84,4200,N'2026-02-12',N'On rent',N'Damage hold',N'Row A-5',469,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Gandy Medical Pavilion'),N'month',N'2026-07-08',N'2026-08-05'),
  (N'SCL-1930-5',N'FL-8080',N'SCL-1930',18500,84,4200,N'2024-12-12',N'Available',N'Good',N'Row F-10',2173,NULL,NULL,NULL,NULL,NULL),
  (N'SCL-1930-6',N'FL-3937',N'SCL-1930',18500,84,4200,N'2023-03-12',N'On rent',N'Good',N'Row C-6',1964,N'C-101',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Water Street Tower 3'),N'week',N'2026-06-25',N'2026-07-09'),
  (N'GEN-25K-1',N'FL-4357',N'GEN-25K',22400,96,5000,N'2024-07-12',N'Available',N'Good',N'Row F-7',2235,NULL,NULL,NULL,NULL,NULL),
  (N'GEN-25K-2',N'FL-8500',N'GEN-25K',22400,96,5000,N'2025-10-12',N'On rent',N'Good',N'Row B-13',1970,N'C-105',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Polk Distribution Center'),N'day',N'2026-07-17',N'2026-07-21'),
  (N'GEN-25K-3',N'FL-1119',N'GEN-25K',22400,96,5000,N'2021-11-12',N'On rent',N'Good',N'Row C-14',303,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Riverwalk Hotel Ph 2'),N'month',N'2026-06-15',N'2026-08-10'),
  (N'GEN-25K-4',N'FL-5262',N'GEN-25K',22400,96,5000,N'2021-09-12',N'On rent',N'Good',N'Row B-6',3162,N'C-101',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Ybor Logistics Center'),N'month',N'2026-06-14',N'2026-08-09'),
  (N'LTW-4H-1',N'FL-3036',N'LTW-4H',9800,84,1800,N'2024-04-12',N'On rent',N'Good',N'Row B-1',378,N'C-105',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Polk Distribution Center'),N'month',N'2026-07-09',N'2026-10-01'),
  (N'LTW-4H-2',N'FL-7893',N'LTW-4H',9800,84,1800,N'2025-02-12',N'Available',N'Good',N'Row D-13',1125,NULL,NULL,NULL,NULL,NULL),
  (N'LTW-4H-3',N'FL-6274',N'LTW-4H',9800,84,1800,N'2022-06-12',N'Available',N'Good',N'Row A-4',1531,NULL,NULL,NULL,NULL,NULL),
  (N'LTW-4H-4',N'FL-7179',N'LTW-4H',9800,84,1800,N'2026-02-12',N'Available',N'Damage hold',N'Row E-2',260,NULL,NULL,NULL,NULL,NULL),
  (N'LTW-4H-5',N'FL-5560',N'LTW-4H',9800,84,1800,N'2026-08-12',N'On rent',N'Good',N'Row D-11',2514,N'C-103',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Lake Nona Data Hall B'),N'month',N'2026-06-18',N'2026-09-10'),
  (N'ACP-5T-1',N'FL-1546',N'ACP-5T',7600,72,900,N'2024-12-12',N'Available',N'Good',N'Row B-6',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'ACP-5T-2',N'FL-8927',N'ACP-5T',7600,72,900,N'2026-06-12',N'On rent',N'Damage hold',N'Row E-12',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Riverwalk Hotel Ph 2'),N'day',N'2026-07-13',N'2026-07-17'),
  (N'ACP-5T-3',N'FL-3604',N'ACP-5T',7600,72,900,N'2024-04-12',N'Available',N'Good',N'Row C-13',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'ACP-5T-4',N'FL-1985',N'ACP-5T',7600,72,900,N'2023-12-12',N'Available',N'Good',N'Row E-6',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'ACP-5T-5',N'FL-9366',N'ACP-5T',7600,72,900,N'2022-10-12',N'In service',N'Good',N'Row E-2',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'ACP-5T-6',N'FL-7747',N'ACP-5T',7600,72,900,N'2026-03-12',N'In service',N'Fair',N'Row C-6',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'DHU-150-1',N'FL-6270',N'DHU-150',3400,60,400,N'2025-06-12',N'Available',N'Good',N'Row D-2',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'DHU-150-2',N'FL-4651',N'DHU-150',3400,60,400,N'2023-04-12',N'Available',N'Good',N'Row F-14',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'DHU-150-3',N'FL-3032',N'DHU-150',3400,60,400,N'2024-06-12',N'On rent',N'Good',N'Row C-5',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Riverwalk Hotel Ph 2'),N'week',N'2026-06-27',N'2026-07-18'),
  (N'DHU-150-4',N'FL-5365',N'DHU-150',3400,60,400,N'2024-04-12',N'Available',N'Fair',N'Row F-6',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'DHU-150-5',N'FL-3746',N'DHU-150',3400,60,400,N'2023-09-12',N'In transit',N'Fair',N'Row C-7',NULL,N'C-105',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Polk Distribution Center'),N'month',N'2026-06-15',N'2026-10-05'),
  (N'PDU-100-1',N'FL-7701',N'PDU-100',4100,96,600,N'2023-05-12',N'In service',N'Good',N'Row E-7',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'PDU-100-2',N'FL-2844',N'PDU-100',4100,96,600,N'2026-05-12',N'On rent',N'Good',N'Row F-8',NULL,N'C-105',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Polk Distribution Center'),N'day',N'2026-07-23',N'2026-07-26'),
  (N'PDU-100-3',N'FL-4463',N'PDU-100',4100,96,600,N'2023-08-12',N'Available',N'Good',N'Row C-5',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'PDU-100-4',N'FL-8606',N'PDU-100',4100,96,600,N'2025-05-12',N'On rent',N'Fair',N'Row A-2',NULL,N'C-101',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Ybor Logistics Center'),N'week',N'2026-06-18',N'2026-07-02'),
  (N'TRL-824-1',N'FL-2829',N'TRL-824',32000,120,9500,N'2023-08-12',N'In transit',N'Good',N'Row A-6',NULL,N'C-101',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Ybor Logistics Center'),N'month',N'2026-06-13',N'2026-09-05'),
  (N'TRL-824-2',N'FL-6972',N'TRL-824',32000,120,9500,N'2021-06-12',N'Available',N'Good',N'Row A-7',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'TRL-824-3',N'FL-8591',N'TRL-824',32000,120,9500,N'2023-06-12',N'On rent',N'Good',N'Row F-9',NULL,N'C-103',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Lake Nona Data Hall B'),N'month',N'2026-05-25',N'2026-06-22'),
  (N'TRL-824-4',N'FL-3734',N'TRL-824',32000,120,9500,N'2020-12-12',N'On rent',N'Good',N'Row D-5',NULL,N'C-104',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Port Manatee Berth 4'),N'month',N'2026-07-25',N'2026-09-19'),
  (N'TRL-824-5',N'FL-5353',N'TRL-824',32000,120,9500,N'2025-12-12',N'On rent',N'Good',N'Row A-1',NULL,N'C-101',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Water Street Tower 3'),N'month',N'2026-07-15',N'2026-08-12'),
  (N'CON-20S-1',N'FL-8096',N'CON-20S',5200,180,1600,N'2025-10-12',N'Available',N'Good',N'Row B-12',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'CON-20S-2',N'FL-3953',N'CON-20S',5200,180,1600,N'2018-04-12',N'On rent',N'Good',N'Row C-10',NULL,N'C-106',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Southbank Mixed-Use'),N'month',N'2026-06-09',N'2026-08-04'),
  (N'CON-20S-3',N'FL-2334',N'CON-20S',5200,180,1600,N'2023-01-12',N'On rent',N'Damage hold',N'Row A-2',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Riverwalk Hotel Ph 2'),N'month',N'2026-07-14',N'2026-10-06'),
  (N'CON-20S-4',N'FL-7191',N'CON-20S',5200,180,1600,N'2017-03-12',N'On rent',N'Good',N'Row C-5',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Gandy Medical Pavilion'),N'month',N'2026-06-08',N'2026-09-28'),
  (N'CON-20S-5',N'FL-5572',N'CON-20S',5200,180,1600,N'2024-12-12',N'On rent',N'Damage hold',N'Row B-9',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Riverwalk Hotel Ph 2'),N'month',N'2026-07-20',N'2026-10-12'),
  (N'CON-20S-6',N'FL-1429',N'CON-20S',5200,180,1600,N'2026-02-12',N'On rent',N'Fair',N'Row A-5',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Gandy Medical Pavilion'),N'month',N'2026-07-30',N'2026-11-19'),
  (N'CON-20S-7',N'FL-8810',N'CON-20S',5200,180,1600,N'2016-09-12',N'On rent',N'Good',N'Row A-3',NULL,N'C-103',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'I-4 Ultimate Field Office'),N'month',N'2026-06-11',N'2026-07-09'),
  (N'CON-20S-8',N'FL-5763',N'CON-20S',5200,180,1600,N'2021-03-12',N'On rent',N'Good',N'Row A-13',NULL,N'C-103',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Lake Nona Data Hall B'),N'month',N'2026-07-14',N'2026-09-08'),
  (N'LAP-R15-1',N'FL-7102',N'LAP-R15',2400,36,180,N'2025-12-12',N'Available',N'Good',N'Row D-1',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'LAP-R15-2',N'FL-5483',N'LAP-R15',2400,36,180,N'2026-08-12',N'On rent',N'Good',N'Row D-11',NULL,N'C-103',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'I-4 Ultimate Field Office'),N'week',N'2026-05-26',N'2026-06-09'),
  (N'LAP-R15-3',N'FL-3864',N'LAP-R15',2400,36,180,N'2025-11-12',N'On rent',N'Good',N'Row E-12',NULL,N'C-103',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'I-4 Ultimate Field Office'),N'day',N'2026-07-15',N'2026-07-19'),
  (N'LAP-R15-4',N'FL-6197',N'LAP-R15',2400,36,180,N'2025-12-12',N'On rent',N'Fair',N'Row C-12',NULL,N'C-101',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Ybor Logistics Center'),N'week',N'2026-07-31',N'2026-08-14'),
  (N'LAP-R15-5',N'FL-4578',N'LAP-R15',2400,36,180,N'2026-05-12',N'Available',N'Fair',N'Row D-8',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'LAP-R15-6',N'FL-2959',N'LAP-R15',2400,36,180,N'2026-08-12',N'Available',N'Damage hold',N'Row A-10',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'LAP-R15-7',N'FL-1340',N'LAP-R15',2400,36,180,N'2025-05-12',N'Available',N'Fair',N'Row F-13',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'LAP-R15-8',N'FL-4769',N'LAP-R15',2400,36,180,N'2026-08-12',N'In service',N'Good',N'Row A-12',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'LAP-R15-9',N'FL-3150',N'LAP-R15',2400,36,180,N'2026-04-12',N'In service',N'Fair',N'Row F-7',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'LAP-R15-10',N'FL-5994',N'LAP-R15',2400,36,180,N'2026-02-12',N'On rent',N'Fair',N'Row A-8',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Gandy Medical Pavilion'),N'day',N'2026-05-30',N'2026-05-31'),
  (N'LAP-R15-11',N'FL-7613',N'LAP-R15',2400,36,180,N'2026-03-12',N'On rent',N'Fair',N'Row B-1',NULL,N'C-103',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Lake Nona Data Hall B'),N'day',N'2026-07-02',N'2026-07-06'),
  (N'LAP-R15-12',N'FL-2756',N'LAP-R15',2400,36,180,N'2025-06-12',N'On rent',N'Fair',N'Row A-3',NULL,N'C-105',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Polk Distribution Center'),N'day',N'2026-07-16',N'2026-07-21'),
  (N'LAP-R15-13',N'FL-4375',N'LAP-R15',2400,36,180,N'2024-07-12',N'In service',N'Good',N'Row A-5',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'LAP-R15-14',N'FL-8518',N'LAP-R15',2400,36,180,N'2024-09-12',N'On rent',N'Fair',N'Row F-10',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Gandy Medical Pavilion'),N'month',N'2026-06-02',N'2026-06-30'),
  (N'MON-27C-1',N'FL-5503',N'MON-27C',310,48,25,N'2026-01-12',N'Available',N'Good',N'Row F-11',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'MON-27C-2',N'FL-7122',N'MON-27C',310,48,25,N'2025-09-12',N'On rent',N'Damage hold',N'Row C-14',NULL,N'C-104',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Port Manatee Berth 4'),N'week',N'2026-06-14',N'2026-06-28'),
  (N'MON-27C-3',N'FL-8741',N'MON-27C',310,48,25,N'2025-10-12',N'On rent',N'Fair',N'Row C-14',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Riverwalk Hotel Ph 2'),N'month',N'2026-07-31',N'2026-09-25'),
  (N'MON-27C-4',N'FL-6408',N'MON-27C',310,48,25,N'2025-02-12',N'On rent',N'Good',N'Row E-2',NULL,N'C-105',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Polk Distribution Center'),N'day',N'2026-07-10',N'2026-07-13'),
  (N'MON-27C-5',N'FL-8027',N'MON-27C',310,48,25,N'2024-03-12',N'Available',N'Good',N'Row D-3',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'MON-27C-6',N'FL-9646',N'MON-27C',310,48,25,N'2026-07-12',N'Available',N'Good',N'Row C-14',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'MON-27C-7',N'FL-2265',N'MON-27C',310,48,25,N'2026-02-12',N'On rent',N'Good',N'Row E-7',NULL,N'C-101',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Water Street Tower 3'),N'day',N'2026-06-09',N'2026-06-11'),
  (N'MON-27C-8',N'FL-7836',N'MON-27C',310,48,25,N'2024-02-12',N'Available',N'Good',N'Row E-12',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'MON-27C-9',N'FL-9455',N'MON-27C',310,48,25,N'2023-12-12',N'Available',N'Good',N'Row A-11',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'MON-27C-10',N'FL-4725',N'MON-27C',310,48,25,N'2026-04-12',N'Available',N'Good',N'Row C-5',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'MON-27C-11',N'FL-3106',N'MON-27C',310,48,25,N'2024-11-12',N'On rent',N'Damage hold',N'Row C-6',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Gandy Medical Pavilion'),N'day',N'2026-06-17',N'2026-06-20'),
  (N'MON-27C-12',N'FL-1487',N'MON-27C',310,48,25,N'2024-06-12',N'On rent',N'Good',N'Row D-6',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Riverwalk Hotel Ph 2'),N'month',N'2026-06-26',N'2026-08-21'),
  (N'MON-27C-13',N'FL-8868',N'MON-27C',310,48,25,N'2025-05-12',N'On rent',N'Good',N'Row D-9',NULL,N'C-105',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Polk Distribution Center'),N'day',N'2026-07-26',N'2026-07-29'),
  (N'MON-27C-14',N'FL-7249',N'MON-27C',310,48,25,N'2026-05-12',N'In transit',N'Good',N'Row E-6',NULL,N'C-103',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Lake Nona Data Hall B'),N'week',N'2026-07-23',N'2026-08-06'),
  (N'MON-27C-15',N'FL-5630',N'MON-27C',310,48,25,N'2026-01-12',N'Available',N'Good',N'Row C-9',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'MON-27C-16',N'FL-4011',N'MON-27C',310,48,25,N'2025-12-12',N'In transit',N'Good',N'Row B-5',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Riverwalk Hotel Ph 2'),N'day',N'2026-06-16',N'2026-06-17'),
  (N'MON-27C-17',N'FL-2392',N'MON-27C',310,48,25,N'2025-11-12',N'Available',N'Good',N'Row F-12',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'MON-27C-18',N'FL-9773',N'MON-27C',310,48,25,N'2024-03-12',N'On rent',N'Good',N'Row B-11',NULL,N'C-106',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Southbank Mixed-Use'),N'week',N'2026-07-10',N'2026-07-17'),
  (N'MON-27C-19',N'FL-8154',N'MON-27C',310,48,25,N'2026-06-12',N'On rent',N'Good',N'Row D-13',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Gandy Medical Pavilion'),N'week',N'2026-07-21',N'2026-07-28'),
  (N'MON-27C-20',N'FL-1726',N'MON-27C',310,48,25,N'2026-03-12',N'In service',N'Fair',N'Row A-2',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'MON-27C-21',N'FL-3345',N'MON-27C',310,48,25,N'2024-06-12',N'Available',N'Good',N'Row F-3',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'MON-27C-22',N'FL-7488',N'MON-27C',310,48,25,N'2024-03-12',N'On rent',N'Fair',N'Row F-6',NULL,N'C-103',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Lake Nona Data Hall B'),N'week',N'2026-07-02',N'2026-07-09'),
  (N'MON-27C-23',N'FL-9107',N'MON-27C',310,48,25,N'2023-10-12',N'In transit',N'Good',N'Row B-5',NULL,N'C-104',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Port Manatee Berth 4'),N'week',N'2026-05-24',N'2026-05-31'),
  (N'MON-27C-24',N'FL-8202',N'MON-27C',310,48,25,N'2026-08-12',N'Available',N'Good',N'Row B-14',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'PLT-36W-1',N'FL-6687',N'PLT-36W',6200,48,500,N'2026-01-12',N'On rent',N'Good',N'Row F-14',NULL,N'C-103',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'I-4 Ultimate Field Office'),N'day',N'2026-08-01',N'2026-08-05'),
  (N'PLT-36W-2',N'FL-8306',N'PLT-36W',6200,48,500,N'2026-04-12',N'Available',N'Fair',N'Row D-1',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'PLT-36W-3',N'FL-9925',N'PLT-36W',6200,48,500,N'2023-11-12',N'On rent',N'Fair',N'Row B-2',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Gandy Medical Pavilion'),N'month',N'2026-07-08',N'2026-09-02'),
  (N'PLT-36W-4',N'FL-7592',N'PLT-36W',6200,48,500,N'2026-08-12',N'Available',N'Good',N'Row A-2',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'WIF-LTE-1',N'FL-7110',N'WIF-LTE',1850,36,100,N'2026-08-12',N'On rent',N'Good',N'Row E-11',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Riverwalk Hotel Ph 2'),N'month',N'2026-06-18',N'2026-09-10'),
  (N'WIF-LTE-2',N'FL-5491',N'WIF-LTE',1850,36,100,N'2025-12-12',N'In transit',N'Good',N'Row C-14',NULL,N'C-105',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Polk Distribution Center'),N'day',N'2026-06-15',N'2026-06-17'),
  (N'WIF-LTE-3',N'FL-3872',N'WIF-LTE',1850,36,100,N'2026-07-12',N'On rent',N'Good',N'Row E-14',NULL,N'C-101',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Ybor Logistics Center'),N'day',N'2026-07-18',N'2026-07-19'),
  (N'WIF-LTE-4',N'FL-6205',N'WIF-LTE',1850,36,100,N'2025-04-12',N'In transit',N'Damage hold',N'Row B-6',NULL,N'C-104',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Port Manatee Berth 4'),N'week',N'2026-07-07',N'2026-07-28'),
  (N'WIF-LTE-5',N'FL-4586',N'WIF-LTE',1850,36,100,N'2026-08-12',N'On rent',N'Good',N'Row D-1',NULL,N'C-105',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Polk Distribution Center'),N'day',N'2026-07-08',N'2026-07-10'),
  (N'WIF-LTE-6',N'FL-2967',N'WIF-LTE',1850,36,100,N'2024-10-12',N'On rent',N'Good',N'Row B-6',NULL,N'C-105',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Polk Distribution Center'),N'week',N'2026-06-15',N'2026-06-29'),
  (N'WIF-LTE-7',N'FL-1348',N'WIF-LTE',1850,36,100,N'2025-01-12',N'Available',N'Good',N'Row B-2',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'WIF-LTE-8',N'FL-3681',N'WIF-LTE',1850,36,100,N'2026-07-12',N'On rent',N'Good',N'Row F-9',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Riverwalk Hotel Ph 2'),N'day',N'2026-06-04',N'2026-06-09'),
  (N'WIF-LTE-9',N'FL-2062',N'WIF-LTE',1850,36,100,N'2024-12-12',N'In service',N'Good',N'Row D-10',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'PRJ-4KC-1',N'FL-7951',N'PRJ-4KC',2900,48,200,N'2024-02-12',N'In transit',N'Fair',N'Row C-1',NULL,N'C-106',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Southbank Mixed-Use'),N'day',N'2026-05-31',N'2026-06-02'),
  (N'PRJ-4KC-2',N'FL-9570',N'PRJ-4KC',2900,48,200,N'2023-12-12',N'On rent',N'Fair',N'Row A-14',NULL,N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Riverwalk Hotel Ph 2'),N'month',N'2026-05-31',N'2026-08-23'),
  (N'PRJ-4KC-3',N'FL-2189',N'PRJ-4KC',2900,48,200,N'2024-02-12',N'Available',N'Fair',N'Row D-9',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'PRJ-4KC-4',N'FL-8856',N'PRJ-4KC',2900,48,200,N'2025-11-12',N'On rent',N'Good',N'Row D-11',NULL,N'C-103',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Lake Nona Data Hall B'),N'month',N'2026-07-30',N'2026-09-24'),
  (N'PRJ-4KC-5',N'FL-1475',N'PRJ-4KC',2900,48,200,N'2026-07-12',N'In service',N'Good',N'Row B-12',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'CAM-SIT-1',N'FL-3116',N'CAM-SIT',3600,48,250,N'2025-03-12',N'On rent',N'Fair',N'Row B-6',NULL,N'C-101',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Water Street Tower 3'),N'month',N'2026-06-18',N'2026-09-10'),
  (N'CAM-SIT-2',N'FL-7973',N'CAM-SIT',3600,48,250,N'2026-05-12',N'On rent',N'Good',N'Row B-10',NULL,N'C-103',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'I-4 Ultimate Field Office'),N'month',N'2026-07-16',N'2026-09-10'),
  (N'CAM-SIT-3',N'FL-6354',N'CAM-SIT',3600,48,250,N'2025-10-12',N'Available',N'Damage hold',N'Row B-10',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'CAM-SIT-4',N'FL-7259',N'CAM-SIT',3600,48,250,N'2024-05-12',N'Available',N'Good',N'Row D-5',NULL,NULL,NULL,NULL,NULL,NULL),
  (N'CAM-SIT-5',N'FL-5640',N'CAM-SIT',3600,48,250,N'2024-04-12',N'In transit',N'Good',N'Row A-8',NULL,N'C-106',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Southbank Mixed-Use'),N'month',N'2026-07-15',N'2026-09-09'),
  (N'CAM-SIT-6',N'FL-1497',N'CAM-SIT',3600,48,250,N'2026-08-12',N'On rent',N'Fair',N'Row B-8',NULL,N'C-104',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Port Manatee Berth 4'),N'month',N'2026-07-18',N'2026-09-12'),
  (N'CAM-SIT-7',N'FL-8878',N'CAM-SIT',3600,48,250,N'2025-08-12',N'On rent',N'Damage hold',N'Row F-5',NULL,N'C-101',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Water Street Tower 3'),N'month',N'2026-06-14',N'2026-07-12')
) AS s(asset_id,tag,sku,acquisition_cost,useful_life_months,salvage_value,in_service_date,status,condition,yard_bin,meter_hours,customer_id,jobsite_id,term,rental_start,expected_return)
ON t.asset_id=s.asset_id
WHEN MATCHED THEN UPDATE SET tag=s.tag, status=s.status, condition=s.condition, yard_bin=s.yard_bin,
  meter_hours=s.meter_hours, customer_id=s.customer_id, jobsite_id=s.jobsite_id, term=s.term,
  rental_start=s.rental_start, expected_return=s.expected_return, updated_at=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT(asset_id,tag,sku,acquisition_cost,useful_life_months,salvage_value,in_service_date,status,condition,yard_bin,meter_hours,customer_id,jobsite_id,term,rental_start,expected_return)
  VALUES(s.asset_id,s.tag,s.sku,s.acquisition_cost,s.useful_life_months,s.salvage_value,s.in_service_date,s.status,s.condition,s.yard_bin,s.meter_hours,s.customer_id,s.jobsite_id,s.term,s.rental_start,s.expected_return);
GO

UPDATE a SET ltd_revenue = v.rev FROM cls.Asset a JOIN (VALUES
  (N'SCL-1930-1',30784),
  (N'SCL-1930-2',28821),
  (N'SCL-1930-3',101526),
  (N'SCL-1930-4',9861),
  (N'SCL-1930-5',50130),
  (N'SCL-1930-6',83402),
  (N'GEN-25K-1',73127),
  (N'GEN-25K-2',10603),
  (N'GEN-25K-3',130043),
  (N'GEN-25K-4',144372),
  (N'LTW-4H-1',12145),
  (N'LTW-4H-2',14802),
  (N'LTW-4H-3',40681),
  (N'LTW-4H-4',4931),
  (N'LTW-4H-5',4668),
  (N'ACP-5T-1',13010),
  (N'ACP-5T-2',380),
  (N'ACP-5T-3',10029),
  (N'ACP-5T-4',25316),
  (N'ACP-5T-5',12220),
  (N'ACP-5T-6',4076),
  (N'DHU-150-1',3672),
  (N'DHU-150-2',15042),
  (N'DHU-150-3',3927),
  (N'DHU-150-4',8285),
  (N'DHU-150-5',14187),
  (N'PDU-100-1',3162),
  (N'PDU-100-2',718),
  (N'PDU-100-3',4699),
  (N'PDU-100-4',3511),
  (N'TRL-824-1',144443),
  (N'TRL-824-2',118776),
  (N'TRL-824-3',60909),
  (N'TRL-824-4',90191),
  (N'TRL-824-5',21667),
  (N'CON-20S-1',4832),
  (N'CON-20S-2',12194),
  (N'CON-20S-3',20037),
  (N'CON-20S-4',45959),
  (N'CON-20S-5',7463),
  (N'CON-20S-6',2677),
  (N'CON-20S-7',76605),
  (N'CON-20S-8',40027),
  (N'LAP-R15-1',1702),
  (N'LAP-R15-2',1635),
  (N'LAP-R15-3',3074),
  (N'LAP-R15-4',2690),
  (N'LAP-R15-5',191),
  (N'LAP-R15-6',1280),
  (N'LAP-R15-7',3776),
  (N'LAP-R15-8',438),
  (N'LAP-R15-9',485),
  (N'LAP-R15-10',1065),
  (N'LAP-R15-11',1263),
  (N'LAP-R15-12',3085),
  (N'LAP-R15-13',1297),
  (N'LAP-R15-14',6797),
  (N'MON-27C-1',133),
  (N'MON-27C-2',296),
  (N'MON-27C-3',333),
  (N'MON-27C-4',572),
  (N'MON-27C-5',865),
  (N'MON-27C-6',6),
  (N'MON-27C-7',237),
  (N'MON-27C-8',775),
  (N'MON-27C-9',1262),
  (N'MON-27C-10',154),
  (N'MON-27C-11',731),
  (N'MON-27C-12',788),
  (N'MON-27C-13',175),
  (N'MON-27C-14',63),
  (N'MON-27C-15',54),
  (N'MON-27C-16',73),
  (N'MON-27C-17',303),
  (N'MON-27C-18',902),
  (N'MON-27C-19',54),
  (N'MON-27C-20',86),
  (N'MON-27C-21',920),
  (N'MON-27C-22',527),
  (N'MON-27C-23',203),
  (N'MON-27C-24',44),
  (N'PLT-36W-1',4414),
  (N'PLT-36W-2',2856),
  (N'PLT-36W-3',12416),
  (N'PLT-36W-4',4124),
  (N'WIF-LTE-1',368),
  (N'WIF-LTE-2',796),
  (N'WIF-LTE-3',216),
  (N'WIF-LTE-4',3135),
  (N'WIF-LTE-5',213),
  (N'WIF-LTE-6',1668),
  (N'WIF-LTE-7',920),
  (N'WIF-LTE-8',157),
  (N'WIF-LTE-9',1689),
  (N'PRJ-4KC-1',2232),
  (N'PRJ-4KC-2',12791),
  (N'PRJ-4KC-3',10768),
  (N'PRJ-4KC-4',2184),
  (N'PRJ-4KC-5',238),
  (N'CAM-SIT-1',7937),
  (N'CAM-SIT-2',1154),
  (N'CAM-SIT-3',3188),
  (N'CAM-SIT-4',3521),
  (N'CAM-SIT-5',13127),
  (N'CAM-SIT-6',757),
  (N'CAM-SIT-7',3594)
) AS v(asset_id,rev) ON v.asset_id = a.asset_id;
GO

/* ---------- pooled stock ---------- */
MERGE cls.StockPool AS t USING (VALUES
  (N'FNC-612',960,384,26,78,96,12,N'2024-05-08',N'Yard C',48024),
  (N'CHR-TSK',288,111,1,165,60,15,N'2023-01-08',N'Yard D',26759),
  (N'TBL-6FT',140,75,5,128,72,10,N'2022-09-08',N'Yard D',10922),
  (N'DSK-60J',96,51,2,420,84,40,N'2022-07-08',N'Yard D',31619),
  (N'FIL-4DR',42,23,1,980,120,120,N'2025-04-08',N'Yard C',17734),
  (N'PLN-RCK',36,14,0,340,84,30,N'2023-09-08',N'Yard B',8458)
) AS s(sku,qty_total,qty_on_rent,qty_service,unit_cost,useful_life_months,salvage_value,in_service_date,yard_bin,ltd_revenue)
ON t.sku=s.sku
WHEN MATCHED THEN UPDATE SET qty_total=s.qty_total, qty_on_rent=s.qty_on_rent, qty_service=s.qty_service,
  unit_cost=s.unit_cost, ltd_revenue=s.ltd_revenue, updated_at=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT(sku,qty_total,qty_on_rent,qty_service,unit_cost,useful_life_months,salvage_value,in_service_date,yard_bin,ltd_revenue)
  VALUES(s.sku,s.qty_total,s.qty_on_rent,s.qty_service,s.unit_cost,s.useful_life_months,s.salvage_value,s.in_service_date,s.yard_bin,s.ltd_revenue);
GO

/* ---------- quotes ---------- */
MERGE cls.Quote AS t USING (VALUES
  (N'Q-2418',N'C-101',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Water Street Tower 3'),N'Sent',N'WS3-0442',1,1,N'2026-08-18',N'2026-09-01',N'2026-08-01',N'2026-08-15',NULL),
  (N'Q-2421',N'C-103',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Lake Nona Data Hall B'),N'Accepted',N'LN-DH-118',0,1,N'2026-08-10',N'2026-11-02',N'2026-07-26',N'2026-08-09',NULL),
  (N'Q-2423',N'C-102',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Riverwalk Hotel Ph 2'),N'Accepted',N'RW2-3390',1,1,N'2026-08-04',N'2026-09-01',N'2026-07-30',N'2026-08-13',NULL),
  (N'Q-2425',N'C-105',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Polk Distribution Center'),N'Draft',NULL,1,1,N'2026-08-07',N'2026-08-16',N'2026-08-03',N'2026-08-17',NULL),
  (N'Q-2409',N'C-106',(SELECT jobsite_id FROM cls.Jobsite WHERE name=N'Southbank Mixed-Use'),N'Lost',NULL,1,1,N'2026-07-17',N'2026-07-31',N'2026-07-09',N'2026-07-23',N'Availability')
) AS s(quote_id,customer_id,jobsite_id,status,po_number,waiver,delivery,window_start,window_end,created_at,expires_at,lost_reason)
ON t.quote_id=s.quote_id
WHEN MATCHED THEN UPDATE SET status=s.status, po_number=s.po_number, waiver=s.waiver, delivery=s.delivery,
  window_start=s.window_start, window_end=s.window_end, expires_at=s.expires_at, lost_reason=s.lost_reason, updated_at=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT(quote_id,customer_id,jobsite_id,status,po_number,waiver,delivery,window_start,window_end,created_at,expires_at,lost_reason)
  VALUES(s.quote_id,s.customer_id,s.jobsite_id,s.status,s.po_number,s.waiver,s.delivery,s.window_start,s.window_end,s.created_at,s.expires_at,s.lost_reason);
GO

DELETE FROM cls.QuoteLine WHERE quote_id IN (N'Q-2418', N'Q-2421', N'Q-2423', N'Q-2425', N'Q-2409');
INSERT cls.QuoteLine (quote_id,line_no,sku,qty,uom_level,start_date,end_date,discount_pct) VALUES
  (N'Q-2418',1,N'SCL-1930',2,1,N'2026-08-18',N'2026-09-01',0),
  (N'Q-2418',2,N'LTW-4H',3,1,N'2026-08-18',N'2026-09-01',0),
  (N'Q-2418',3,N'FNC-612',4,2,N'2026-08-18',N'2026-10-13',0),
  (N'Q-2421',1,N'TRL-824',1,1,N'2026-08-10',N'2026-11-02',0),
  (N'Q-2421',2,N'DSK-60J',6,1,N'2026-08-10',N'2026-11-02',0),
  (N'Q-2421',3,N'CHR-TSK',2,2,N'2026-08-10',N'2026-11-02',0),
  (N'Q-2421',4,N'WIF-LTE',1,1,N'2026-08-10',N'2026-11-02',0),
  (N'Q-2423',1,N'SCL-1930',2,1,N'2026-08-04',N'2026-09-01',0),
  (N'Q-2423',2,N'LTW-4H',2,1,N'2026-08-04',N'2026-09-01',0),
  (N'Q-2423',3,N'ACP-5T',2,1,N'2026-08-04',N'2026-09-01',0),
  (N'Q-2423',4,N'TBL-6FT',2,2,N'2026-08-04',N'2026-09-01',0),
  (N'Q-2425',1,N'GEN-25K',1,1,N'2026-08-07',N'2026-08-16',22),
  (N'Q-2409',1,N'ACP-5T',4,1,N'2026-07-17',N'2026-07-31',0);
GO

PRINT 'Seed complete.';
GO