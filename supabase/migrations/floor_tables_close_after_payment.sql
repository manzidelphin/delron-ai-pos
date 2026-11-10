-- ================================================
-- Tables that disappear after payment.
-- A table is created when customers sit down (number + name, the name is kept
-- in the existing `section` column) and is hidden once its bill is paid, so the
-- POS only lists tables in use. Hidden, not deleted: orders keep their table, so
-- reports still show "T12 Bruce".
-- The owner can mark real furniture tables as fixed: those go back to "empty"
-- after payment instead of disappearing.
-- ================================================
ALTER TABLE floor_tables ADD COLUMN IF NOT EXISTS is_fixed    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE floor_tables ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_floor_tables_active
  ON floor_tables (business_id) WHERE archived_at IS NULL;
