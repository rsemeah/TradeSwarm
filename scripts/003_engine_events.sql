-- TradeSwarm Engine Events Schema
-- Migration 003: Engine events, scan results, and calibration

-- Engine events (for debugging and audit)
CREATE TABLE IF NOT EXISTS engine_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  correlation_id TEXT,
  stage TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'degraded', 'skipped')),
  ticker TEXT,
  duration_ms INTEGER,
  reason_code TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scan results (cached scanner output)
CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  candidates JSONB NOT NULL,
  regime JSONB,
  scanned_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  determinism_hash TEXT,
  engine_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learn why cache (AI explanations)
CREATE TABLE IF NOT EXISTS learn_why_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT NOT NULL UNIQUE,
  ticker TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  explanation TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calibration metrics (for threshold tuning)
CREATE TABLE IF NOT EXISTS calibration_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_trades INTEGER NOT NULL DEFAULT 0,
  win_count INTEGER NOT NULL DEFAULT 0,
  loss_count INTEGER NOT NULL DEFAULT 0,
  breakeven_count INTEGER NOT NULL DEFAULT 0,
  pending_count INTEGER NOT NULL DEFAULT 0,
  win_rate DECIMAL(5, 4),
  avg_trust_score DECIMAL(5, 2),
  avg_pnl DECIMAL(12, 2),
  regime_distribution JSONB,
  safety_mode_distribution JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Threshold history (for tracking threshold changes)
CREATE TABLE IF NOT EXISTS threshold_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  threshold_name TEXT NOT NULL,
  old_value DECIMAL(12, 6),
  new_value DECIMAL(12, 6) NOT NULL,
  reason TEXT,
  triggered_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_engine_events_correlation ON engine_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_engine_events_stage ON engine_events(stage);
CREATE INDEX IF NOT EXISTS idx_engine_events_created ON engine_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id ON scan_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_expires ON scan_results(expires_at);

CREATE INDEX IF NOT EXISTS idx_learn_why_key ON learn_why_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_learn_why_expires ON learn_why_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_calibration_period ON calibration_metrics(period_start, period_end);

-- RLS Policies
ALTER TABLE engine_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE learn_why_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE threshold_history ENABLE ROW LEVEL SECURITY;

-- Engine events are system-wide, readable by authenticated users
CREATE POLICY "Engine events readable by authenticated" ON engine_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Engine events insertable by authenticated" ON engine_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Scan results
CREATE POLICY "Scan results readable by owner or public" ON scan_results FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Scan results insertable by authenticated" ON scan_results FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Learn why cache is public read
CREATE POLICY "Learn why cache readable" ON learn_why_cache FOR SELECT USING (true);
CREATE POLICY "Learn why cache insertable by authenticated" ON learn_why_cache FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Calibration metrics are system-wide
CREATE POLICY "Calibration metrics readable by authenticated" ON calibration_metrics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Calibration metrics insertable by service" ON calibration_metrics FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Threshold history is audit trail
CREATE POLICY "Threshold history readable by authenticated" ON threshold_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Threshold history insertable by service" ON threshold_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');
