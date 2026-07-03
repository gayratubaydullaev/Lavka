-- Phase 5: Go API schema (subset compatible with mock OpenAPI)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS darkstores (
  id UUID PRIMARY KEY,
  city TEXT NOT NULL,
  city_ru TEXT NOT NULL,
  name TEXT NOT NULL,
  radius_km NUMERIC(4,1) NOT NULL,
  sku_count INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY,
  name JSONB NOT NULL,
  parent_id UUID
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  darkstore_id UUID NOT NULL REFERENCES darkstores(id),
  name JSONB NOT NULL,
  price INT NOT NULL,
  weight_g INT,
  is_halal BOOLEAN NOT NULL DEFAULT false,
  images JSONB NOT NULL DEFAULT '[]',
  stock INT NOT NULL DEFAULT 0,
  zone TEXT NOT NULL,
  category UUID REFERENCES categories(id),
  brand TEXT,
  barcode TEXT,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL,
  darkstore_id UUID NOT NULL REFERENCES darkstores(id),
  customer_id TEXT NOT NULL,
  subtotal INT NOT NULL,
  delivery_fee INT NOT NULL DEFAULT 0,
  total_amount INT NOT NULL,
  delivery_address JSONB NOT NULL,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  name TEXT NOT NULL,
  quantity INT NOT NULL,
  price INT NOT NULL,
  zone TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('picker', 'courier')),
  darkstore_id UUID NOT NULL REFERENCES darkstores(id),
  online BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(2, 1) NOT NULL DEFAULT 4.5,
  zone_certifications JSONB NOT NULL DEFAULT '[]',
  shift_started_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_products_darkstore ON products(darkstore_id);
CREATE INDEX IF NOT EXISTS idx_orders_darkstore ON orders(darkstore_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_staff_darkstore ON staff(darkstore_id);
