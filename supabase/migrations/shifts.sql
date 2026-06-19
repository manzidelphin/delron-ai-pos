-- ================================================================
-- SHIFT MANAGEMENT — Create shifts table
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ================================================================

CREATE TABLE IF NOT EXISTS shifts (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id      UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  branch_id        UUID REFERENCES branches(id)   ON DELETE SET NULL,
  staff_id         UUID REFERENCES staff(id)       ON DELETE CASCADE NOT NULL,
  staff_name       TEXT NOT NULL,
  role             TEXT NOT NULL,
  started_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at         TIMESTAMPTZ,
  opening_cash     DECIMAL(12,2),    -- cash in till at shift start (cashiers/bartenders)
  closing_cash     DECIMAL(12,2),    -- cash physically counted at shift end
  expected_cash    DECIMAL(12,2),    -- opening_cash + cash sales during shift
  cash_variance    DECIMAL(12,2),    -- closing_cash - expected_cash (negative = shortage)
  total_sales      DECIMAL(12,2) DEFAULT 0,
  total_orders     INTEGER DEFAULT 0,
  total_items_sold DECIMAL(12,2) DEFAULT 0,
  status           TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own business shifts" ON shifts
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS shifts_business_id_idx ON shifts (business_id);
CREATE INDEX IF NOT EXISTS shifts_staff_id_idx    ON shifts (staff_id);
CREATE INDEX IF NOT EXISTS shifts_status_idx      ON shifts (status);
CREATE INDEX IF NOT EXISTS shifts_started_at_idx  ON shifts (started_at DESC);
