-- ================================================
-- Platform Admins Table
-- Replaces is_platform_admin on staff (which was business-scoped and cascaded on business delete).
-- This table is keyed by user_id only — independent of any business membership.
-- Run in: https://supabase.com/dashboard/project/hfjggupbkbudnqplxviq/sql/new
-- ================================================

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Users can read their own record so client-side code can check its own status.
-- No INSERT/UPDATE/DELETE policy — only service role (direct DB access) can grant this.
CREATE POLICY "users_read_own_platform_admin_record"
  ON platform_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Seed founder accounts
INSERT INTO platform_admins (user_id)
SELECT id FROM auth.users
WHERE email IN ('manzidelphin2@gmail.com', 'delfin@delronpos.rw')
ON CONFLICT DO NOTHING;

-- Also update the audit log RLS to use the new table
DROP POLICY IF EXISTS "platform_admins_read_audit_log" ON admin_audit_log;

CREATE POLICY "platform_admins_read_audit_log"
  ON admin_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE platform_admins.user_id = auth.uid()
    )
  );

-- Note: is_platform_admin column on staff is intentionally left in place (not dropped)
-- to avoid breaking any existing data. It is no longer used for access control.
