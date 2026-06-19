-- ================================================================
-- SEED TEST BUSINESSES — DELRON AI POS
-- Run in: Supabase SQL Editor (runs as postgres superuser)
-- https://supabase.com/dashboard/project/hfjggupbkbudnqplxviq/sql/new
--
-- Creates 4 multi-module test businesses.
-- Password for all owners : Delron@2002
-- PIN for all staff       : 2002
--
-- Safe to re-run — all inserts use ON CONFLICT DO NOTHING.
-- If you want a clean re-seed, run the CLEANUP block below first.
-- ================================================================

-- Optional cleanup (uncomment to reset):
-- DELETE FROM auth.users WHERE email IN (
--   'testbarrest@delronpos.rw','testsuperbakery@delronpos.rw',
--   'testsuperbar@delronpos.rw','testsuperbakerybar@delronpos.rw'
-- );
-- DELETE FROM businesses WHERE id IN (
--   '11000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002',
--   '33000000-0000-0000-0000-000000000002','44000000-0000-0000-0000-000000000002'
-- );

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  -- Business 1: Bar + Restaurant
  b1_user   UUID := '11000000-0000-0000-0000-000000000001';
  b1_biz    UUID := '11000000-0000-0000-0000-000000000002';
  b1_branch UUID := '11000000-0000-0000-0000-000000000003';

  -- Business 2: Supermarket + Bakery
  b2_user   UUID := '22000000-0000-0000-0000-000000000001';
  b2_biz    UUID := '22000000-0000-0000-0000-000000000002';
  b2_branch UUID := '22000000-0000-0000-0000-000000000003';

  -- Business 3: Supermarket + Bar
  b3_user   UUID := '33000000-0000-0000-0000-000000000001';
  b3_biz    UUID := '33000000-0000-0000-0000-000000000002';
  b3_branch UUID := '33000000-0000-0000-0000-000000000003';

  -- Business 4: Supermarket + Bakery + Bar
  b4_user   UUID := '44000000-0000-0000-0000-000000000001';
  b4_biz    UUID := '44000000-0000-0000-0000-000000000002';
  b4_branch UUID := '44000000-0000-0000-0000-000000000003';

  raw_mat_id   UUID;
  menu_item_id UUID;

BEGIN

-- ================================================================
-- HELPER: insert an auth user + identity (email/password provider)
-- ================================================================

-- ── BUSINESS 1: Bar + Restaurant ──────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) VALUES (
    b1_user, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'testbarrest@delronpos.rw',
    crypt('Delron@2002', gen_salt('bf', 10)), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), b1_user, 'testbarrest@delronpos.rw',
    jsonb_build_object('sub', b1_user::text, 'email', 'testbarrest@delronpos.rw'),
    'email', NOW(), NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO businesses (id, name, owner_id, modules, location, phone, email)
  VALUES (b1_biz, 'Test Bar Restaurant', b1_user,
          ARRAY['bar','restaurant'], 'Kigali, Rwanda', '+250788000001', 'testbarrest@delronpos.rw')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO branches (id, business_id, name, location, is_main)
  VALUES (b1_branch, b1_biz, 'Test Bar Restaurant — Main Branch', 'Kigali', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO staff (business_id, branch_id, user_id, name, email, role, pin, is_active)
  VALUES (b1_biz, b1_branch, b1_user, 'Test BarRest Owner', 'testbarrest@delronpos.rw', 'owner', '2002', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO staff (business_id, branch_id, name, phone, role, pin, is_active) VALUES
    (b1_biz, b1_branch, 'Uwase (Bartender)', '+250788001001', 'bartender', '2002', true),
    (b1_biz, b1_branch, 'Mugisha (Waiter)',  '+250788001002', 'waiter',    '2002', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO bar_items (business_id, branch_id, name, category, price_per_bottle, price_per_shot, shots_per_bottle, quantity_bottles, min_quantity, is_active) VALUES
    (b1_biz, b1_branch, 'Primus Beer',       'beer',   600,   0,    0, 48, 6, true),
    (b1_biz, b1_branch, 'Johnnie Walker Red', 'whisky', 18000, 1500, 12,  5, 2, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO floor_tables (business_id, branch_id, table_number, capacity, section, status) VALUES
    (b1_biz, b1_branch, '1', 4, 'main',    'empty'),
    (b1_biz, b1_branch, '2', 6, 'main',    'empty'),
    (b1_biz, b1_branch, '3', 2, 'terrace', 'empty')
  ON CONFLICT DO NOTHING;

  -- Restaurant raw material + menu item + recipe
  INSERT INTO raw_materials (id, business_id, branch_id, name, unit, quantity, min_quantity, cost_per_unit)
  VALUES (gen_random_uuid(), b1_biz, b1_branch, 'Chicken', 'kg', 10, 2, 3500)
  RETURNING id INTO raw_mat_id;

  INSERT INTO menu_items (id, business_id, branch_id, name, category, selling_price, cost_price, prep_time_minutes, is_active)
  VALUES (gen_random_uuid(), b1_biz, b1_branch, 'Grilled Chicken', 'main', 5500, 3500, 20, true)
  RETURNING id INTO menu_item_id;

  INSERT INTO menu_recipes (menu_item_id, raw_material_id, quantity_needed, unit)
  VALUES (menu_item_id, raw_mat_id, 0.5, 'kg');


-- ── BUSINESS 2: Supermarket + Bakery ──────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) VALUES (
    b2_user, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'testsuperbakery@delronpos.rw',
    crypt('Delron@2002', gen_salt('bf', 10)), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), b2_user, 'testsuperbakery@delronpos.rw',
    jsonb_build_object('sub', b2_user::text, 'email', 'testsuperbakery@delronpos.rw'),
    'email', NOW(), NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO businesses (id, name, owner_id, modules, location, phone, email)
  VALUES (b2_biz, 'Test Super Bakery', b2_user,
          ARRAY['supermarket','bakery'], 'Kigali, Rwanda', '+250788000002', 'testsuperbakery@delronpos.rw')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO branches (id, business_id, name, location, is_main)
  VALUES (b2_branch, b2_biz, 'Test Super Bakery — Main Branch', 'Kigali', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO staff (business_id, branch_id, user_id, name, email, role, pin, is_active)
  VALUES (b2_biz, b2_branch, b2_user, 'Test SuperBakery Owner', 'testsuperbakery@delronpos.rw', 'owner', '2002', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO staff (business_id, branch_id, name, phone, role, pin, is_active) VALUES
    (b2_biz, b2_branch, 'Ingabire (Cashier)', '+250788002001', 'cashier', '2002', true),
    (b2_biz, b2_branch, 'Habimana (Baker)',   '+250788002002', 'baker',   '2002', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO products (business_id, branch_id, name, category, price, cost_price, quantity, min_quantity, unit, stock_type, is_active) VALUES
    (b2_biz, b2_branch, 'Inyange Milk 1L',       'dairy',     800, 600, 100, 10, 'litre',  'supermarket', true),
    (b2_biz, b2_branch, 'Azam Spaghetti 500g',   'dry goods', 700, 500,  80, 10, 'packet', 'supermarket', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO raw_materials (business_id, branch_id, name, unit, quantity, min_quantity, cost_per_unit)
  VALUES (b2_biz, b2_branch, 'Flour', 'kg', 50, 5, 800)
  ON CONFLICT DO NOTHING;

  INSERT INTO finished_goods (business_id, branch_id, name, selling_price, cost_price, quantity, unit, category, is_active) VALUES
    (b2_biz, b2_branch, 'Bread Loaf',       800, 400, 30, 'loaf', 'bakery',  true),
    (b2_biz, b2_branch, 'Mandazi (6 pcs)',  500, 200, 50, 'pack', 'pastry',  true)
  ON CONFLICT DO NOTHING;


-- ── BUSINESS 3: Supermarket + Bar ─────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) VALUES (
    b3_user, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'testsuperbar@delronpos.rw',
    crypt('Delron@2002', gen_salt('bf', 10)), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), b3_user, 'testsuperbar@delronpos.rw',
    jsonb_build_object('sub', b3_user::text, 'email', 'testsuperbar@delronpos.rw'),
    'email', NOW(), NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO businesses (id, name, owner_id, modules, location, phone, email)
  VALUES (b3_biz, 'Test Super Bar', b3_user,
          ARRAY['supermarket','bar'], 'Kigali, Rwanda', '+250788000003', 'testsuperbar@delronpos.rw')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO branches (id, business_id, name, location, is_main)
  VALUES (b3_branch, b3_biz, 'Test Super Bar — Main Branch', 'Kigali', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO staff (business_id, branch_id, user_id, name, email, role, pin, is_active)
  VALUES (b3_biz, b3_branch, b3_user, 'Test SuperBar Owner', 'testsuperbar@delronpos.rw', 'owner', '2002', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO staff (business_id, branch_id, name, phone, role, pin, is_active) VALUES
    (b3_biz, b3_branch, 'Nkurunziza (Cashier)',  '+250788003001', 'cashier',   '2002', true),
    (b3_biz, b3_branch, 'Uwimana (Bartender)',    '+250788003002', 'bartender', '2002', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO products (business_id, branch_id, name, category, price, cost_price, quantity, min_quantity, unit, stock_type, is_active) VALUES
    (b3_biz, b3_branch, 'Coca-Cola 500ml',  'beverages', 500,  350, 120, 12, 'bottle', 'supermarket', true),
    (b3_biz, b3_branch, 'Pringles Original','snacks',    2500, 1800, 40,  5, 'can',    'supermarket', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO bar_items (business_id, branch_id, name, category, price_per_bottle, price_per_shot, shots_per_bottle, quantity_bottles, min_quantity, is_active) VALUES
    (b3_biz, b3_branch, 'Mutzig Beer', 'beer', 700,  0,   0,  60, 10, true),
    (b3_biz, b3_branch, 'Konyagi',     'gin',  5000, 500, 10,  8,  2, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO floor_tables (business_id, branch_id, table_number, capacity, section, status) VALUES
    (b3_biz, b3_branch, '1', 4, 'main', 'empty'),
    (b3_biz, b3_branch, '2', 4, 'main', 'empty')
  ON CONFLICT DO NOTHING;


-- ── BUSINESS 4: Supermarket + Bakery + Bar ────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) VALUES (
    b4_user, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'testsuperbakerybar@delronpos.rw',
    crypt('Delron@2002', gen_salt('bf', 10)), NOW(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), b4_user, 'testsuperbakerybar@delronpos.rw',
    jsonb_build_object('sub', b4_user::text, 'email', 'testsuperbakerybar@delronpos.rw'),
    'email', NOW(), NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO businesses (id, name, owner_id, modules, location, phone, email)
  VALUES (b4_biz, 'Test Super Bakery Bar', b4_user,
          ARRAY['supermarket','bakery','bar'], 'Kigali, Rwanda', '+250788000004', 'testsuperbakerybar@delronpos.rw')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO branches (id, business_id, name, location, is_main)
  VALUES (b4_branch, b4_biz, 'Test Super Bakery Bar — Main Branch', 'Kigali', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO staff (business_id, branch_id, user_id, name, email, role, pin, is_active)
  VALUES (b4_biz, b4_branch, b4_user, 'Test SuperBakeryBar Owner', 'testsuperbakerybar@delronpos.rw', 'owner', '2002', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO staff (business_id, branch_id, name, phone, role, pin, is_active) VALUES
    (b4_biz, b4_branch, 'Mukamurenzi (Cashier)', '+250788004001', 'cashier',   '2002', true),
    (b4_biz, b4_branch, 'Bizimana (Baker)',       '+250788004002', 'baker',     '2002', true),
    (b4_biz, b4_branch, 'Kayitesi (Bartender)',   '+250788004003', 'bartender', '2002', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO products (business_id, branch_id, name, category, price, cost_price, quantity, min_quantity, unit, stock_type, is_active) VALUES
    (b4_biz, b4_branch, 'Blue Band 250g', 'dairy',     900,  650, 60,  8,  'packet', 'supermarket', true),
    (b4_biz, b4_branch, 'Sugar 1kg',      'dry goods', 1100, 800, 200, 20, 'kg',     'supermarket', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO raw_materials (business_id, branch_id, name, unit, quantity, min_quantity, cost_per_unit)
  VALUES (b4_biz, b4_branch, 'Flour', 'kg', 100, 10, 800)
  ON CONFLICT DO NOTHING;

  INSERT INTO finished_goods (business_id, branch_id, name, selling_price, cost_price, quantity, unit, category, is_active) VALUES
    (b4_biz, b4_branch, 'Bread Loaf', 800, 400, 40, 'loaf',  'bakery', true),
    (b4_biz, b4_branch, 'Croissant',  600, 250, 25, 'piece', 'pastry', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO bar_items (business_id, branch_id, name, category, price_per_bottle, price_per_shot, shots_per_bottle, quantity_bottles, min_quantity, is_active) VALUES
    (b4_biz, b4_branch, 'Amstel Beer', 'beer',    650,   0,    0,  72, 12, true),
    (b4_biz, b4_branch, 'Amarula',     'liqueur', 22000, 2000, 11,  4,  2, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO floor_tables (business_id, branch_id, table_number, capacity, section, status) VALUES
    (b4_biz, b4_branch, '1', 4, 'main', 'empty'),
    (b4_biz, b4_branch, '2', 6, 'main', 'empty')
  ON CONFLICT DO NOTHING;


-- ================================================================
  RAISE NOTICE '✅ 4 test businesses seeded successfully';
  RAISE NOTICE '';
  RAISE NOTICE '  1. testbarrest@delronpos.rw        bar + restaurant';
  RAISE NOTICE '  2. testsuperbakery@delronpos.rw    supermarket + bakery';
  RAISE NOTICE '  3. testsuperbar@delronpos.rw       supermarket + bar';
  RAISE NOTICE '  4. testsuperbakerybar@delronpos.rw supermarket + bakery + bar';
  RAISE NOTICE '';
  RAISE NOTICE '  Password : Delron@2002';
  RAISE NOTICE '  Staff PIN: 2002';
-- ================================================================
END $$;
