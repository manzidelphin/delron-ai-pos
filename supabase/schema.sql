-- ================================================
-- DELRON AI POS — FULL DATABASE SCHEMA
-- Supabase Project: hfjggupbkbudnqplxviq
-- Run in: https://supabase.com/dashboard/project/hfjggupbkbudnqplxviq/sql/new
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- BUSINESSES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT,
  phone TEXT,
  email TEXT,
  modules TEXT[] DEFAULT '{}',
  plan TEXT DEFAULT 'free',
  language TEXT DEFAULT 'en',
  currency TEXT DEFAULT 'RWF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- BRANCHES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  phone TEXT,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- STAFF / USERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN (
    'owner','manager','cashier','baker',
    'waiter','bartender'
  )),
  pin TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- SUPPLIERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- PRODUCTS TABLE (Supermarket & Bar items)
-- ================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  barcode TEXT,
  category TEXT,
  subcategory TEXT,
  description TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) DEFAULT 0,
  stock_type TEXT DEFAULT 'supermarket'
    CHECK (stock_type IN ('supermarket','bar')),
  quantity DECIMAL(12,2) DEFAULT 0,
  min_quantity DECIMAL(12,2) DEFAULT 5,
  unit TEXT DEFAULT 'piece',
  expiry_date DATE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- RAW MATERIALS TABLE (Bakery ingredients)
-- ================================================
CREATE TABLE IF NOT EXISTS raw_materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  quantity DECIMAL(12,3) DEFAULT 0,
  min_quantity DECIMAL(12,3) DEFAULT 1,
  cost_per_unit DECIMAL(12,2) DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- FINISHED GOODS TABLE (Baked products)
-- ================================================
CREATE TABLE IF NOT EXISTS finished_goods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  barcode TEXT,
  barcode_type TEXT DEFAULT 'generic'
    CHECK (barcode_type IN ('pre-packaged','generic')),
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) DEFAULT 0,
  quantity DECIMAL(12,2) DEFAULT 0,
  unit TEXT DEFAULT 'piece',
  category TEXT DEFAULT 'bakery',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- RECIPES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  finished_good_id UUID REFERENCES finished_goods(id)
    ON DELETE CASCADE,
  name TEXT NOT NULL,
  yield_quantity DECIMAL(12,2) DEFAULT 1,
  yield_unit TEXT DEFAULT 'piece',
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- RECIPE INGREDIENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  raw_material_id UUID REFERENCES raw_materials(id)
    ON DELETE CASCADE,
  quantity_needed DECIMAL(12,3) NOT NULL,
  unit TEXT NOT NULL
);

-- ================================================
-- PRODUCTION LOGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS production_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  baker_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  finished_good_id UUID REFERENCES finished_goods(id)
    ON DELETE CASCADE,
  quantity_produced DECIMAL(12,2) NOT NULL,
  batch_label TEXT,
  production_time TIMESTAMPTZ DEFAULT NOW(),
  expiry_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- WASTE LOGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS waste_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  item_type TEXT CHECK (item_type IN ('product','finished_good','raw_material')),
  item_name TEXT NOT NULL,
  quantity_wasted DECIMAL(12,2) NOT NULL,
  reason TEXT,
  cost_of_waste DECIMAL(12,2) DEFAULT 0,
  logged_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- BAR ITEMS TABLE (with shot tracking)
-- ================================================
CREATE TABLE IF NOT EXISTS bar_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  barcode TEXT,
  category TEXT DEFAULT 'beer',
  price_per_bottle DECIMAL(12,2) DEFAULT 0,
  price_per_shot DECIMAL(12,2) DEFAULT 0,
  shots_per_bottle INTEGER DEFAULT 0,
  quantity_bottles DECIMAL(12,2) DEFAULT 0,
  shots_remaining DECIMAL(12,2) DEFAULT 0,
  min_quantity DECIMAL(12,2) DEFAULT 2,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABLES (Restaurant/Bar floor plan)
-- ================================================
CREATE TABLE IF NOT EXISTS floor_tables (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  section TEXT DEFAULT 'main',
  status TEXT DEFAULT 'empty'
    CHECK (status IN ('empty','occupied','bill_requested','reserved')),
  current_order_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- ORDERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  table_id UUID REFERENCES floor_tables(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  order_type TEXT DEFAULT 'counter'
    CHECK (order_type IN ('counter','table','takeaway','credit','bar_tab')),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','preparing','ready','completed','cancelled')),
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN (
    'cash','mtn_momo','airtel_money',
    'bank_transfer','credit','split'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- ORDER ITEMS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'product','finished_good','bar_item','custom'
  )),
  item_name TEXT NOT NULL,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TRANSACTIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  total DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  receipt_number TEXT UNIQUE,
  ebm_number TEXT,
  module_source TEXT CHECK (module_source IN (
    'supermarket','bakery','bar','restaurant'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- CREDITS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS credits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  items_description TEXT,
  total_amount DECIMAL(12,2) NOT NULL,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  balance DECIMAL(12,2) DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'unpaid'
    CHECK (status IN ('unpaid','partial','paid','overdue')),
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- NOTIFICATIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info'
    CHECK (type IN ('info','warning','alert','success')),
  category TEXT CHECK (category IN (
    'stock','credit','sales','production','staff','system'
  )),
  sent_via TEXT[] DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- AI CONVERSATIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================
CREATE INDEX IF NOT EXISTS idx_products_business
  ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode
  ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_branch
  ON products(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_business
  ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_created
  ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_business
  ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created
  ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credits_business
  ON credits(business_id);
CREATE INDEX IF NOT EXISTS idx_credits_status
  ON credits(status);
CREATE INDEX IF NOT EXISTS idx_finished_goods_business
  ON finished_goods(business_id);
CREATE INDEX IF NOT EXISTS idx_production_logs_business
  ON production_logs(business_id);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only see their own business data
--
-- NOTE — PIN-only staff (bakers, cashiers, bartenders) log in without a
-- Supabase auth session, so auth.uid() is always null for them. Adding a
-- per-role RLS policy cannot help here because the uid-based subquery would
-- still return nothing. Instead, all bakery/bar/POS API routes use the
-- service-role admin client (createAdminClient) after getAuthContext() has
-- already validated the caller's identity via the pos_operator cookie.
-- RLS stays enabled on every table; the admin client simply bypasses it
-- server-side once the caller is confirmed legitimate.
CREATE POLICY "Users see own business" ON businesses
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users see own branches" ON branches
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own products" ON products
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own orders" ON orders
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own transactions" ON transactions
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own credits" ON credits
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own staff" ON staff
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own suppliers" ON suppliers
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own raw_materials" ON raw_materials
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own finished_goods" ON finished_goods
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own bar_items" ON bar_items
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own production_logs" ON production_logs
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own waste_logs" ON waste_logs
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own floor_tables" ON floor_tables
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own notifications" ON notifications
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own ai_conversations" ON ai_conversations
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own recipes" ON recipes
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users see own recipe_ingredients" ON recipe_ingredients
  FOR ALL USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users see own order_items" ON order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM orders WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

-- ================================================
-- DONE — 19 tables created with RLS policies
-- ================================================
