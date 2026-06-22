-- ================================================
-- Platform Admin Feature
-- Run in: https://supabase.com/dashboard/project/hfjggupbkbudnqplxviq/sql/new
-- ================================================

-- Add platform admin flag to staff table.
-- SECURITY: This column is intentionally not settable via any API route or UI.
-- It can ONLY be set by a database administrator with direct DB access (Supabase dashboard SQL editor).
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false;

-- Mark the founder's accounts as platform admins.
-- Uses auth.users email lookup so it works even if staff email is different.
UPDATE staff
SET is_platform_admin = true
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN ('manzidelphin2@gmail.com', 'delfin@delronpos.rw')
);

-- ================================================
-- Admin Audit Log
-- Permanent record of every platform admin action.
-- ================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  target_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Platform admins can read audit logs.
-- All writes go through the service role (admin client) only — no INSERT policy for authenticated users.
CREATE POLICY "platform_admins_read_audit_log"
  ON admin_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
        AND staff.is_platform_admin = true
        AND staff.is_active = true
    )
  );
