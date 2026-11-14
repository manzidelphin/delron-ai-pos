-- ================================================
-- Low-stock emails to owners and managers.
--  * businesses.low_stock_email: on/off switch (Settings → Notifications), on by default.
--  * stock_alert_log: remembers which "out of stock" alerts were already sent
--    today, so each item alerts at most once per day. Server only.
-- ================================================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS low_stock_email BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS stock_alert_log (
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  item_type   TEXT NOT NULL,          -- product | bar_item
  item_id     UUID NOT NULL,
  alert_day   DATE NOT NULL,          -- Kigali date
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, item_type, item_id, alert_day)
);
ALTER TABLE stock_alert_log ENABLE ROW LEVEL SECURITY;
