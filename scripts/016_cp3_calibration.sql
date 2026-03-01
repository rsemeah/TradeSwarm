-- CP3: Outcome-Calibrated Confidence
-- Adds calibration_policy table, calibration_dataset view, and
-- confidence_at_entry column to trades_v2.

-- ─── 1. confidence_at_entry on trades_v2 ────────────────────────────────────
ALTER TABLE trades_v2
  ADD COLUMN IF NOT EXISTS confidence_at_entry NUMERIC(6,5)
    GENERATED ALWAYS AS (
      CASE WHEN engine_score_at_entry IS NOT NULL
        THEN LEAST(1.0, GREATEST(0.0, engine_score_at_entry::numeric / 100))
      END
    ) STORED;

-- ─── 2. r_multiple on trades_v2 ─────────────────────────────────────────────
-- R = realized_pnl / max_risk (null when max_risk is zero or null)
ALTER TABLE trades_v2
  ADD COLUMN IF NOT EXISTS r_multiple NUMERIC(8,4)
    GENERATED ALWAYS AS (
      CASE WHEN max_risk IS NOT NULL AND max_risk <> 0
        THEN ROUND(realized_pnl / max_risk, 4)
      END
    ) STORED;

-- ─── 3. outcome_label (canonical) ───────────────────────────────────────────
-- Canonical label: win | loss | scratch | open
-- "scratch" = |realized_pnl| < $1 (effectively breakeven / rounding noise)
ALTER TABLE trades_v2
  ADD COLUMN IF NOT EXISTS outcome_label TEXT
    GENERATED ALWAYS AS (
      CASE
        WHEN outcome = 'open'                              THEN 'open'
        WHEN outcome = 'win'                               THEN 'win'
        WHEN outcome = 'loss'                              THEN 'loss'
        WHEN outcome = 'breakeven'                         THEN 'scratch'
        WHEN realized_pnl IS NULL                          THEN 'open'
        WHEN realized_pnl > 1                              THEN 'win'
        WHEN realized_pnl < -1                             THEN 'loss'
        ELSE 'scratch'
      END
    ) STORED;

-- ─── 4. calibration_policy (operator-controlled gate) ───────────────────────
CREATE TABLE IF NOT EXISTS calibration_policy (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name               TEXT NOT NULL UNIQUE,
  min_confidence_to_execute NUMERIC(4,3) NOT NULL DEFAULT 0.55
    CHECK (min_confidence_to_execute >= 0 AND min_confidence_to_execute <= 1),
  max_risk_pct              NUMERIC(5,2) NOT NULL DEFAULT 5.0
    CHECK (max_risk_pct > 0 AND max_risk_pct <= 100),
  halt_on_drift_alert       BOOLEAN NOT NULL DEFAULT FALSE,
  strategy_overrides        JSONB NOT NULL DEFAULT '{}',
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by               TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO calibration_policy
  (policy_name, min_confidence_to_execute, max_risk_pct, halt_on_drift_alert, is_active)
VALUES
  ('default', 0.55, 5.0, FALSE, TRUE)
ON CONFLICT (policy_name) DO NOTHING;

ALTER TABLE calibration_policy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calibration_policy_read_all" ON calibration_policy;
CREATE POLICY "calibration_policy_read_all"
  ON calibration_policy FOR SELECT USING (TRUE);

-- ─── 5. calibration_dataset_v2 view ─────────────────────────────────────────
-- Single canonical view: one row per closed trade, all CP3 fields together.
CREATE OR REPLACE VIEW calibration_dataset_v2 AS
SELECT
  t.id                      AS trade_id,
  t.user_id,
  t.ticker,
  t.strategy_type,
  t.entry_date              AS opened_at,
  t.created_at              AS closed_at,
  t.confidence_at_entry,
  t.engine_score_at_entry   AS score_at_entry,
  t.regime_at_entry,
  t.realized_pnl,
  t.max_risk,
  t.credit_received,
  t.r_multiple,
  t.outcome,
  t.outcome_label
FROM trades_v2 t
WHERE t.outcome <> 'open'
  AND t.outcome IS NOT NULL;

-- ─── 6. cp3_drift_events (audit log for drift state changes) ─────────────────
CREATE TABLE IF NOT EXISTS cp3_drift_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drift_state   TEXT NOT NULL CHECK (drift_state IN ('OK', 'WARN', 'ALERT')),
  ece           NUMERIC(8,6) NOT NULL,
  sample_size   INTEGER NOT NULL,
  window_days   INTEGER NOT NULL,
  payload       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cp3_drift_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cp3_drift_events_read_all" ON cp3_drift_events;
CREATE POLICY "cp3_drift_events_read_all"
  ON cp3_drift_events FOR SELECT USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_cp3_drift_events_created
  ON cp3_drift_events (created_at DESC);
