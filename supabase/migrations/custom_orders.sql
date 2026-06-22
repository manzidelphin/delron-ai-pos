-- ================================================================
-- Custom Orders — made-to-order bakery items (cakes, etc.)
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ================================================================

CREATE TABLE IF NOT EXISTS custom_orders (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id     UUID NOT NULL REFERENCES businesses(id)  ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id)    ON DELETE CASCADE,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  description     TEXT NOT NULL,
  order_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date        DATE        NOT NULL,
  total_price     INTEGER     NOT NULL CHECK (total_price > 0),
  deposit_paid    INTEGER     NOT NULL DEFAULT 0 CHECK (deposit_paid >= 0),
  status          TEXT        NOT NULL DEFAULT 'ordered'
                    CHECK (status IN ('ordered','in_progress','ready','collected','cancelled')),
  created_by      UUID REFERENCES staff(id),
  collected_by    UUID REFERENCES staff(id),
  collected_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS custom_orders_business_due ON custom_orders(business_id, due_date);
CREATE INDEX IF NOT EXISTS custom_orders_status       ON custom_orders(business_id, status);
