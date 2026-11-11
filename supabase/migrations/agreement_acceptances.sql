-- ================================================
-- Signed agreements: one row each time a business owner accepts the
-- Terms of Service and Privacy Policy (at sign-up, or again when asked).
-- Used by the admin portal to download the business's signed agreement (PDF).
-- Written only by the server (service role); no client access.
-- ================================================
CREATE TABLE IF NOT EXISTS agreement_acceptances (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id           UUID,                 -- auth user who accepted
  accepted_by_name  TEXT NOT NULL,
  accepted_by_email TEXT,
  accepted_by_phone TEXT,
  business_name     TEXT NOT NULL,        -- name at the time of signing
  terms_version     TEXT NOT NULL,        -- e.g. "2026-07-03" (Terms "last updated" date)
  method            TEXT NOT NULL CHECK (method IN ('signup', 'reaccept')),
  ip_address        TEXT,
  user_agent        TEXT,
  accepted_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreement_acceptances_business
  ON agreement_acceptances (business_id, accepted_at DESC);

ALTER TABLE agreement_acceptances ENABLE ROW LEVEL SECURITY;
