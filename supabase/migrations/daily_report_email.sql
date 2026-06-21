-- Add opt-out toggle for daily report emails (default ON for all businesses)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS daily_report_email BOOLEAN NOT NULL DEFAULT TRUE;
