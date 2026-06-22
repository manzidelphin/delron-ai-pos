-- ================================================
-- Billing / Subscription Tracker
-- Run in: https://supabase.com/dashboard/project/hfjggupbkbudnqplxviq/sql/new
-- ================================================

-- Add billing columns to businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'trial'
    CHECK (subscription_plan IN ('trial','starter','professional','enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active'
    CHECK (subscription_status IN ('active','overdue','suspended','cancelled')),
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','annual')),
  ADD COLUMN IF NOT EXISTS next_payment_due DATE,
  ADD COLUMN IF NOT EXISTS last_payment_date DATE,
  ADD COLUMN IF NOT EXISTS monthly_amount INTEGER DEFAULT 0;

-- ================================================
-- Billing Payments — payment history log
-- ================================================
CREATE TABLE IF NOT EXISTS billing_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL
    CHECK (payment_method IN ('cash','momo','airtel','bank')),
  -- Uses user_id instead of staff_id — platform admins may have no staff record
  recorded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admins_manage_billing_payments"
  ON billing_payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

-- Existing businesses stay at the 'trial' default — no explicit update needed.
-- Real paying clients can be updated via the admin UI.
