-- WMS tables (TZ §2.5 Phase 2)

CREATE TABLE IF NOT EXISTS wms_cells (
  id TEXT PRIMARY KEY,
  zone TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  capacity_kg INT NOT NULL DEFAULT 100,
  occupied_kg INT NOT NULL DEFAULT 0,
  temperature_zone TEXT NOT NULL DEFAULT 'ambient'
);

CREATE TABLE IF NOT EXISTS wms_writeoffs (
  id TEXT PRIMARY KEY,
  sku_id UUID NOT NULL,
  quantity INT NOT NULL,
  reason TEXT NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending_director',
  director_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wms_inventory_counts (
  id TEXT PRIMARY KEY,
  zone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  items_total INT NOT NULL DEFAULT 0,
  items_counted INT NOT NULL DEFAULT 0,
  variance_pct NUMERIC(5,2),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO wms_inventory_counts (id, zone, status, items_total, items_counted) VALUES
  ('inv-001', 'B', 'scheduled', 120, 0),
  ('inv-002', 'A', 'in_progress', 80, 45)
ON CONFLICT (id) DO NOTHING;

INSERT INTO wms_writeoffs (id, sku_id, quantity, reason, status) VALUES
  ('wo-demo-1', '00000000-0000-4000-8000-000000000003', 2, 'Бой — Молоко', 'pending_director')
ON CONFLICT (id) DO NOTHING;
