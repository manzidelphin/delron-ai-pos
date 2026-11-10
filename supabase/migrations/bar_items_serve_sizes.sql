-- ================================================
-- Spirit serving sizes: besides a single shot (price_per_shot) and the whole
-- bottle (price_per_bottle), a spirit can be sold as a double shot (2 shots)
-- or a quarter bottle (shots_per_bottle / 4 shots), each at a price the owner
-- sets. Empty = that size isn't offered at the POS.
-- ================================================
ALTER TABLE bar_items ADD COLUMN IF NOT EXISTS price_per_double  NUMERIC(12,2);
ALTER TABLE bar_items ADD COLUMN IF NOT EXISTS price_per_quarter NUMERIC(12,2);
