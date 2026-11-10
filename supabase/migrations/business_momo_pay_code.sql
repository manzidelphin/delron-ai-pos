-- ================================================
-- MTN MoMo Pay merchant code (till number) for a business.
-- Printed under the TOTAL on receipts as "*182*8*1*<code>#" so customers
-- can pay the bill with MoMo Pay. Optional: set in Settings or at sign-up.
-- ================================================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS momo_pay_code TEXT;
