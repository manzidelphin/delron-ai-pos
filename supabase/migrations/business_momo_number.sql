-- ================================================
-- Add MoMo receiving number to businesses
-- Shown to cashiers on the POS payment step so they can
-- tell customers exactly where to send MTN MoMo / Airtel Money.
-- ================================================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS momo_number TEXT;
