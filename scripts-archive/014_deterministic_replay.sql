-- Deterministic replay foundation: market snapshots + replay reports.

CREATE TABLE IF NOT EXISTS market_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_hash TEXT NOT NULL UNIQUE,
  snapshot JSONB NOT NULL,
  source TEXT,
  latency_ms INT,
  as_of TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_hash ON market_snapshots(snapshot_hash);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_created_at ON market_snapshots(created_at DESC);

CREATE TABLE IF NOT EXISTS trade_replay_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  receipt_id UUID REFERENCES trade_receipts(id) ON DELETE SET NULL,
  match BOOLEAN NOT NULL,
  mismatch_classification TEXT NOT NULL,
  diff JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_replay_reports_trade_id ON trade_replay_reports(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_replay_reports_created_at ON trade_replay_reports(created_at DESC);
