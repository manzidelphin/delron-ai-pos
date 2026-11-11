-- ================================================
-- Removed items log: every time staff remove drinks/food from an open bill
-- or cancel a table, one row per removed line, with who, why and whether the
-- stock went back. Shown to the owner in Bar Reports.
-- Written only by the server (service role).
-- ================================================
CREATE TABLE IF NOT EXISTS order_item_voids (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id         UUID,
  order_id          UUID NOT NULL,
  table_label       TEXT,                -- e.g. "T12 Bruce" at the time
  item_id           UUID,
  item_type         TEXT NOT NULL,       -- bar_item | menu_item
  item_name         TEXT NOT NULL,
  serving           TEXT,                -- bottle | single | double | quarter | food
  quantity          NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price        NUMERIC NOT NULL DEFAULT 0,
  amount            NUMERIC NOT NULL DEFAULT 0,
  reason            TEXT NOT NULL,
  note              TEXT,
  returned_to_stock BOOLEAN NOT NULL DEFAULT false,
  table_cancelled   BOOLEAN NOT NULL DEFAULT false,
  staff_id          UUID,                -- who removed it
  staff_name        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_item_voids_business_time
  ON order_item_voids (business_id, created_at DESC);

ALTER TABLE order_item_voids ENABLE ROW LEVEL SECURITY;
