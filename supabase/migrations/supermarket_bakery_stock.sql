-- ================================================================
-- SUPERMARKET + BAKERY STOCK MANAGEMENT MIGRATION
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ================================================================

-- 1. Extend daily_stock_counts to support products and raw_materials
--    (bar_item_id stays; new columns are nullable — only one is set per row)
ALTER TABLE daily_stock_counts
  ADD COLUMN IF NOT EXISTS product_id       UUID REFERENCES products(id)      ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS raw_material_id  UUID REFERENCES raw_materials(id) ON DELETE CASCADE;

-- 2. Product Restock Logs (supermarket)
CREATE TABLE IF NOT EXISTS product_restock_logs (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES branches(id)   ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id)   ON DELETE CASCADE,
  item_name         TEXT NOT NULL,
  quantity_received DECIMAL(12,2) NOT NULL,
  cost_per_unit     DECIMAL(12,2) DEFAULT 0,
  supplier_name     TEXT,
  notes             TEXT,
  restocked_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Material Restock Logs (bakery ingredients)
CREATE TABLE IF NOT EXISTS material_restock_logs (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id       UUID REFERENCES businesses(id)    ON DELETE CASCADE,
  branch_id         UUID REFERENCES branches(id)      ON DELETE CASCADE,
  raw_material_id   UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
  item_name         TEXT NOT NULL,
  quantity_received DECIMAL(12,2) NOT NULL,
  unit              TEXT,
  cost_per_unit     DECIMAL(12,2) DEFAULT 0,
  supplier_name     TEXT,
  notes             TEXT,
  restocked_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS
ALTER TABLE product_restock_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_restock_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own product_restock_logs" ON product_restock_logs
  FOR ALL USING (
    business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Users see own material_restock_logs" ON material_restock_logs
  FOR ALL USING (
    business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid())
  );
