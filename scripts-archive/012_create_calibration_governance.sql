-- Calibration and governance tables for outcome tracking + model recalibration

CREATE TABLE IF NOT EXISTS outcome_tracking_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name TEXT NOT NULL UNIQUE,
  horizons_days INTEGER[] NOT NULL DEFAULT ARRAY[1,5,20],
  drift_threshold NUMERIC(6,4) NOT NULL DEFAULT 0.08,
  recalibration_window_days INTEGER NOT NULL DEFAULT 90,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO outcome_tracking_configs (config_name, horizons_days, drift_threshold, recalibration_window_days, is_active)
VALUES ('default', ARRAY[1,5,20], 0.08, 90, TRUE)
ON CONFLICT (config_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS trade_outcome_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  horizon_days INTEGER NOT NULL,
  predicted_probability NUMERIC(6,5) NOT NULL CHECK (predicted_probability >= 0 AND predicted_probability <= 1),
  realized_outcome SMALLINT NOT NULL CHECK (realized_outcome IN (0,1)),
  labeled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trade_id, horizon_days)
);

CREATE TABLE IF NOT EXISTS model_calibration_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  horizon_days INTEGER NOT NULL,
  predicted_probability NUMERIC(6,5) NOT NULL CHECK (predicted_probability >= 0 AND predicted_probability <= 1),
  realized_outcome SMALLINT NOT NULL CHECK (realized_outcome IN (0,1)),
  regime TEXT,
  risk_grade TEXT,
  model_combination TEXT NOT NULL,
  confidence_bucket TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_weight_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL,
  weights JSONB NOT NULL,
  config_meta JSONB,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(version)
);

INSERT INTO model_weight_configs (version, weights, config_meta, is_active, created_by)
VALUES (
  1,
  '{"groq":0.5,"openai":0.5}'::jsonb,
  '{"reason":"seed","windowDays":90}'::jsonb,
  TRUE,
  'migration'
)
ON CONFLICT (version) DO NOTHING;

CREATE TABLE IF NOT EXISTS model_governance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weight_config_id UUID REFERENCES model_weight_configs(id) ON DELETE SET NULL,
  previous_version INTEGER,
  new_version INTEGER,
  change_summary TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  metrics_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE trade_outcome_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_calibration_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_weight_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_governance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_tracking_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_outcome_labels_select_own" ON trade_outcome_labels;
CREATE POLICY "trade_outcome_labels_select_own" ON trade_outcome_labels FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "model_calibration_datasets_select_own" ON model_calibration_datasets;
CREATE POLICY "model_calibration_datasets_select_own" ON model_calibration_datasets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "model_weight_configs_read_all" ON model_weight_configs;
CREATE POLICY "model_weight_configs_read_all" ON model_weight_configs FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "model_governance_log_read_all" ON model_governance_log;
CREATE POLICY "model_governance_log_read_all" ON model_governance_log FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "outcome_tracking_configs_read_all" ON outcome_tracking_configs;
CREATE POLICY "outcome_tracking_configs_read_all" ON outcome_tracking_configs FOR SELECT USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_trade_outcome_labels_horizon ON trade_outcome_labels(horizon_days, labeled_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_outcome_labels_trade ON trade_outcome_labels(trade_id);
CREATE INDEX IF NOT EXISTS idx_model_calibration_observed ON model_calibration_datasets(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_calibration_segments ON model_calibration_datasets(horizon_days, regime, risk_grade, model_combination);
CREATE INDEX IF NOT EXISTS idx_model_weight_active ON model_weight_configs(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_governance_created ON model_governance_log(created_at DESC);
