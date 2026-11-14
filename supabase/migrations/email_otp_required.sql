-- ================================================
-- Email code (2FA) required for owners, managers and platform admins.
--  * login_otps: codes are now stored hashed (in `code`) and count wrong tries.
--  * trusted_devices: a device that passed the code. The browser keeps a random
--    token in an httpOnly cookie; only its SHA-256 hash is stored here.
--    "Trust this device" = 30 days, otherwise 12 hours.
--  * two_factor_status(): called by the middleware with the signed-in user's own
--    token, answers 'not_required' | 'verified' | 'required'. It only ever looks
--    at the caller's own rows (auth.uid()).
-- ================================================

ALTER TABLE login_otps ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS trusted_devices (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,
  remembered   BOOLEAN NOT NULL DEFAULT false,
  user_agent   TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_lookup ON trusted_devices (user_id, token_hash);
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION two_factor_status(p_token_hash TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN 'not_required'
    WHEN NOT (
      EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active AND role IN ('owner', 'manager'))
      OR EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
    ) THEN 'not_required'
    WHEN p_token_hash IS NOT NULL AND EXISTS (
      SELECT 1 FROM trusted_devices
       WHERE user_id = auth.uid() AND token_hash = p_token_hash AND expires_at > now()
    ) THEN 'verified'
    ELSE 'required'
  END;
$$;

REVOKE ALL ON FUNCTION two_factor_status(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION two_factor_status(TEXT) TO authenticated, service_role;
