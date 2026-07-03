-- Seed data aligned with mock-server (Phase 5)

INSERT INTO darkstores (id, city, city_ru, name, radius_km, sku_count) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tashkent', 'Ташкент', 'Tashkent Center', 3.0, 3900),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Samarkand', 'Самарканд', 'Samarkand Registan', 2.5, 500)
ON CONFLICT (id) DO UPDATE SET sku_count = EXCLUDED.sku_count;

INSERT INTO categories (id, name, parent_id) VALUES
  ('00000000-0000-4000-8000-000000000100', '{"ru":"Свежие продукты","en":"Fresh","uz_latin":"Yangi mahsulotlar"}', NULL),
  ('00000000-0000-4000-8000-000000000101', '{"ru":"Бакалея","en":"Grocery","uz_latin":"Bakaleya"}', NULL),
  ('00000000-0000-4000-8000-000000000102', '{"ru":"Напитки","en":"Drinks","uz_latin":"Ichimliklar"}', NULL),
  ('00000000-0000-4000-8000-000000000103', '{"ru":"Заморозка","en":"Frozen","uz_latin":"Muzlatilgan"}', NULL),
  ('00000000-0000-4000-8000-000000000104', '{"ru":"Хлеб","en":"Bakery","uz_latin":"Non"}', NULL),
  ('00000000-0000-4000-8000-000000000105', '{"ru":"Бытовая химия","en":"Household","uz_latin":"Maishiy kimyo"}', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, darkstore_id, name, price, weight_g, is_halal, images, stock, zone, category, brand, barcode, active)
SELECT
  ('00000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  CASE (i % 12)
    WHEN 0 THEN '{"ru":"Яблоко","en":"Apple","uz_latin":"Olma","uz_cyrillic":"Олма"}'::jsonb
    WHEN 1 THEN '{"ru":"Банан","en":"Banana","uz_latin":"Banan","uz_cyrillic":"Банан"}'::jsonb
    WHEN 2 THEN '{"ru":"Молоко","en":"Milk","uz_latin":"Sut","uz_cyrillic":"Сут"}'::jsonb
    WHEN 3 THEN '{"ru":"Мясо","en":"Meat","uz_latin":"Go''sht","uz_cyrillic":"Гўшт"}'::jsonb
    WHEN 4 THEN '{"ru":"Рис","en":"Rice","uz_latin":"Guruch","uz_cyrillic":"Гуруч"}'::jsonb
    WHEN 5 THEN '{"ru":"Макароны","en":"Pasta","uz_latin":"Makaron","uz_cyrillic":"Makaron"}'::jsonb
    WHEN 6 THEN '{"ru":"Вода","en":"Water","uz_latin":"Suv","uz_cyrillic":"Suv"}'::jsonb
    WHEN 7 THEN '{"ru":"Кола","en":"Cola","uz_latin":"Cola","uz_cyrillic":"Cola"}'::jsonb
    WHEN 8 THEN '{"ru":"Пельмени","en":"Dumplings","uz_latin":"Pelmeni","uz_cyrillic":"Pelmеni"}'::jsonb
    WHEN 9 THEN '{"ru":"Шоколад","en":"Chocolate","uz_latin":"Shokolad","uz_cyrillic":"Shokolad"}'::jsonb
    WHEN 10 THEN '{"ru":"Хлеб","en":"Bread","uz_latin":"Non","uz_cyrillic":"Non"}'::jsonb
    ELSE '{"ru":"Мыло","en":"Soap","uz_latin":"Sabun","uz_cyrillic":"Sabun"}'::jsonb
  END,
  (CASE (i % 12)
    WHEN 0 THEN 12900 WHEN 1 THEN 18900 WHEN 2 THEN 11900 WHEN 3 THEN 85000
    WHEN 4 THEN 15900 WHEN 5 THEN 8900 WHEN 6 THEN 3900 WHEN 7 THEN 7900
    WHEN 8 THEN 24900 WHEN 9 THEN 14900 WHEN 10 THEN 4500 ELSE 6900
  END) + (i % 5) * 500,
  500 + (i % 10) * 100,
  (i % 12) IN (2, 3, 8),
  jsonb_build_array('https://picsum.photos/seed/jl' || i || '/400/400'),
  20 + (i % 30),
  (ARRAY['A','B','C','D','E','F'])[1 + (CASE (i % 12) WHEN 0 THEN 0 WHEN 1 THEN 0 WHEN 2 THEN 0 WHEN 3 THEN 0 WHEN 4 THEN 1 WHEN 5 THEN 1 WHEN 6 THEN 4 WHEN 7 THEN 4 WHEN 8 THEN 2 WHEN 9 THEN 1 WHEN 10 THEN 5 ELSE 3 END)],
  (ARRAY[
    '00000000-0000-4000-8000-000000000100',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000104',
    '00000000-0000-4000-8000-000000000105'
  ])[1 + (i % 6)],
  'Brand ' || ((i % 8) + 1),
  '8600000000' || lpad(i::text, 3, '0'),
  true
FROM generate_series(1, 3900) AS i
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, darkstore_id, name, price, weight_g, is_halal, images, stock, zone, category, brand, barcode, active) VALUES
  ('00000000-0000-4000-8000-000000004001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '{"ru":"Гранат","en":"Pomegranate","uz_latin":"Anor"}', 15900, 400, false, '["https://picsum.photos/seed/sam1/400/400"]', 30, 'A', '00000000-0000-4000-8000-000000000100', 'Samarkand', '860000010001', true),
  ('00000000-0000-4000-8000-000000004002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '{"ru":"Халва","en":"Halva","uz_latin":"Halvo"}', 22000, 300, true, '["https://picsum.photos/seed/sam2/400/400"]', 20, 'B', '00000000-0000-4000-8000-000000000101', 'Samarkand', '860000010002', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO staff (id, name, role, darkstore_id, online, rating, zone_certifications, shift_started_at) VALUES
  ('p1', 'Жасур', 'picker', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true, 4.8, '["A","B","C","D","E","F"]', NOW() - INTERVAL '2 hours'),
  ('p2', 'Нодира', 'picker', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true, 4.6, '["A","B","D","E","F"]', NOW() - INTERVAL '1 hour'),
  ('c1', 'Алишер', 'courier', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true, 4.9, '[]', NOW() - INTERVAL '90 minutes'),
  ('c2', 'Бахром', 'courier', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', false, 4.5, '[]', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, status, darkstore_id, customer_id, subtotal, delivery_fee, total_amount, delivery_address, payment_method, created_at) VALUES
  ('00000000-0000-4000-8000-000000001001', 'ACCEPTED', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cust-dilshod', 25800, 15000, 40800, '{"coordinates":{"lat":41.311,"lng":69.279},"mahalla_id":"m1","landmark":"вход со двора"}', 'payme', NOW()),
  ('00000000-0000-4000-8000-000000001002', 'ASSEMBLY', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cust-madina', 24900, 0, 24900, '{"coordinates":{"lat":41.315,"lng":69.285},"mahalla_id":"m2","landmark":"рядом с мечетью"}', 'click', NOW() - INTERVAL '10 minutes'),
  ('00000000-0000-4000-8000-000000001003', 'READY', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cust-dilshod', 23400, 0, 23400, '{"coordinates":{"lat":41.308,"lng":69.270},"mahalla_id":"m3","landmark":"напротив школы"}', 'payme', NOW() - INTERVAL '20 minutes'),
  ('00000000-0000-4000-8000-000000001004', 'IN_DELIVERY', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cust-madina', 35700, 0, 35700, '{"coordinates":{"lat":41.320,"lng":69.290},"mahalla_id":"m4","landmark":"белый дом"}', 'payme', NOW() - INTERVAL '30 minutes'),
  ('00000000-0000-4000-8000-000000001005', 'DELIVERED', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cust-dilshod', 19400, 0, 19400, '{"coordinates":{"lat":41.305,"lng":69.265},"mahalla_id":"m5","landmark":"за магазином"}', 'click', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (order_id, product_id, name, quantity, price, zone) VALUES
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000001', 'Яблоко', 2, 12900, 'A'),
  ('00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000005', 'Рис', 1, 15900, 'B'),
  ('00000000-0000-4000-8000-000000001003', '00000000-0000-4000-8000-000000000007', 'Вода', 6, 3900, 'E'),
  ('00000000-0000-4000-8000-000000001004', '00000000-0000-4000-8000-000000000003', 'Молоко', 3, 11900, 'A'),
  ('00000000-0000-4000-8000-000000001005', '00000000-0000-4000-8000-000000000002', 'Банан', 1, 19400, 'A');
