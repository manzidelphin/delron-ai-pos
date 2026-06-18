-- ================================================
-- BAR STOCK MANAGEMENT MIGRATION
-- Run in: https://supabase.com/dashboard/project/hfjggupbkbudnqplxviq/sql/new
-- ================================================

-- Bar Restock Logs — records every bulk restock event
CREATE TABLE IF NOT EXISTS bar_restock_logs (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id)   ON DELETE CASCADE,
  bar_item_id     UUID REFERENCES bar_items(id)  ON DELETE CASCADE,
  item_name       TEXT NOT NULL,
  quantity_received DECIMAL(12,2) NOT NULL,
  cost_per_unit   DECIMAL(12,2) DEFAULT 0,
  supplier_name   TEXT,
  notes           TEXT,
  restocked_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Stock Counts — closing count submitted by owner at end of day
CREATE TABLE IF NOT EXISTS daily_stock_counts (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id      UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id)   ON DELETE CASCADE,
  count_date       DATE NOT NULL,
  bar_item_id      UUID REFERENCES bar_items(id)  ON DELETE CASCADE,
  item_name        TEXT NOT NULL,
  opening_quantity DECIMAL(12,2) DEFAULT 0,
  sold_today       DECIMAL(12,2) DEFAULT 0,
  restocked_today  DECIMAL(12,2) DEFAULT 0,
  expected_quantity DECIMAL(12,2) NOT NULL,
  actual_quantity  DECIMAL(12,2) NOT NULL,
  variance         DECIMAL(12,2) NOT NULL DEFAULT 0,
  variance_percent DECIMAL(6,2),
  counted_by       UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE bar_restock_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stock_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own bar_restock_logs" ON bar_restock_logs
  FOR ALL USING (
    business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Users see own daily_stock_counts" ON daily_stock_counts
  FOR ALL USING (
    business_id IN (SELECT business_id FROM staff WHERE user_id = auth.uid())
  );
