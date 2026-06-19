-- ================================================================
-- RESTAURANT MODULE MIGRATION
-- Run this in Supabase SQL Editor BEFORE testing the restaurant module
-- ================================================================

-- 1. Add status column to order_items (required for both Bar KDS and Restaurant KDS)
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'preparing', 'ready', 'served'));

-- Set already-completed orders to 'served' so they don't flood the KDS
UPDATE order_items oi
SET status = 'served'
FROM orders o
WHERE oi.order_id = o.id AND o.status = 'completed';

-- 2. Expand item_type to include 'menu_item'
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_item_type_check;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_item_type_check
    CHECK (item_type IN ('product','finished_good','bar_item','custom','menu_item'));

-- 3. Menu Items table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'main',
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  prep_time_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Menu Recipes table  (maps menu items to raw_materials for ingredient deduction)
CREATE TABLE IF NOT EXISTS menu_recipes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
  quantity_needed DECIMAL(12,3) NOT NULL,
  unit TEXT NOT NULL
);

-- 5. Enable RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_recipes ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Users see own menu items" ON menu_items
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users see own menu recipes" ON menu_recipes
  FOR ALL USING (
    menu_item_id IN (
      SELECT id FROM menu_items WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_business ON menu_items(business_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_active   ON menu_items(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_menu_recipes_item   ON menu_recipes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status  ON order_items(status);
