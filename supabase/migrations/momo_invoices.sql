-- ================================================
-- MTN MoMo Invoicing
-- Run in: https://supabase.com/dashboard/project/hfjggupbkbudnqplxviq/sql/new
-- ================================================

-- Add MoMo tracking columns to businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS momo_request_id TEXT,
  ADD COLUMN IF NOT EXISTS momo_payment_status TEXT
    CHECK (momo_payment_status IN ('pending','successful','failed','expired')),
  ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ;

-- ================================================
-- Invoices — generated monthly per billing cycle
-- ================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','overdue')),
  momo_request_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all invoices
CREATE POLICY "platform_admins_manage_invoices"
  ON invoices FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

-- Business owners can view their own invoices
CREATE POLICY "business_owners_view_own_invoices"
  ON invoices FOR SELECT TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM staff
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role = 'owner'
    )
  );

-- Index for fast lookups by business and due date
CREATE INDEX IF NOT EXISTS idx_invoices_business_due ON invoices (business_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_momo_request ON invoices (momo_request_id) WHERE momo_request_id IS NOT NULL;
