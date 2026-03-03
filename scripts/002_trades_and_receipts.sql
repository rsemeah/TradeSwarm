-- TradeSwarm Trades and Receipts Schema
-- Migration 002: Trade records, receipts, and market snapshots

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  strategy TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('preview', 'simulate', 'execute')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'simulated', 'cancelled', 'expired')),
  amount DECIMAL(12, 2) NOT NULL,
  trust_score INTEGER,
  rationale TEXT,
  ai_consensus JSONB,
  regime_data JSONB,
  risk_data JSONB,
  outcome TEXT CHECK (outcome IN ('win', 'loss', 'breakeven', 'pending', NULL)),
  outcome_pnl DECIMAL(12, 2),
  outcome_recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market snapshots (for deterministic replay)
CREATE TABLE IF NOT EXISTS market_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_hash TEXT NOT NULL UNIQUE,
  snapshot JSONB NOT NULL,
  source TEXT NOT NULL,
  as_of TIMESTAMPTZ,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade receipts (immutable audit trail)
CREATE TABLE IF NOT EXISTS trade_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id TEXT,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  action TEXT NOT NULL,
  amount DECIMAL(12, 2),
  trust_score INTEGER,
  proof_bundle JSONB NOT NULL,
  proof_bundle_version TEXT,
  final_verdict TEXT,
  regime_trend TEXT,
  risk_level TEXT,
  engine_degraded BOOLEAN DEFAULT false,
  warnings TEXT[],
  engine_started_at TIMESTAMPTZ,
  engine_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade replay reports (for determinism verification)
CREATE TABLE IF NOT EXISTS trade_replay_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_receipt_id UUID NOT NULL REFERENCES trade_receipts(id) ON DELETE CASCADE,
  replay_receipt_id UUID REFERENCES trade_receipts(id) ON DELETE SET NULL,
  match BOOLEAN NOT NULL,
  diff JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_ticker ON trades(ticker);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_created ON trades(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON trade_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_trade_id ON trade_receipts(trade_id);
CREATE INDEX IF NOT EXISTS idx_receipts_request_id ON trade_receipts(request_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON trade_receipts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_hash ON market_snapshots(snapshot_hash);
CREATE INDEX IF NOT EXISTS idx_snapshots_as_of ON market_snapshots(as_of DESC);

-- RLS Policies
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_replay_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades" ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades" ON trades FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own receipts" ON trade_receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own receipts" ON trade_receipts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Snapshots are readable by authenticated users" ON market_snapshots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Snapshots can be inserted by authenticated users" ON market_snapshots FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Replay reports readable by authenticated users" ON trade_replay_reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Replay reports insertable by authenticated users" ON trade_replay_reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
