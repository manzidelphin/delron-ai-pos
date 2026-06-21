-- Daily report snapshots — one row per generated snapshot (multiple allowed per day)
CREATE TABLE IF NOT EXISTS daily_reports (
  id              UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id     UUID          NOT NULL,
  report_date     DATE          NOT NULL,
  generated_by    UUID,                          -- staff.id; NULL for auto-generated
  generated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  generation_type TEXT          NOT NULL DEFAULT 'manual' CHECK (generation_type IN ('manual', 'auto')),
  snapshot_data   JSONB         NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS daily_reports_biz_date_idx ON daily_reports (business_id, report_date);
CREATE INDEX IF NOT EXISTS daily_reports_biz_at_idx   ON daily_reports (business_id, generated_at DESC);
