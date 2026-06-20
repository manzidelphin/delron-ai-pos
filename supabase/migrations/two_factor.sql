-- ================================================================
-- TWO-FACTOR AUTHENTICATION (email OTP)
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ================================================================

-- 1. Add 2FA flag to businesses (default OFF — no existing accounts disrupted)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. OTP store — used only by service role, no RLS needed
CREATE TABLE IF NOT EXISTS login_otps (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID NOT NULL,     -- references auth.users(id)
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS login_otps_user_id_idx ON login_otps (user_id);
CREATE INDEX IF NOT EXISTS login_otps_expires_idx  ON login_otps (expires_at);
