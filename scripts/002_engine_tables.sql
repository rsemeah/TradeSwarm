-- TradeSwarm Engine Tables
-- Migration 002: Trade receipts, engine events, and AI consensus storage

-- Trade receipts (immutable execution records)
CREATE TABLE IF NOT EXISTS trade_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  correlation_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  
  -- Decision data
  status TEXT NOT NULL,
  trust_score INTEGER,
  amount DECIMAL(12,2),
  
  -- AI consensus (JSONB for flexibility)
  ai_consensus JSONB,
  
  -- Market context at execution
  regime_data JSONB,
  risk_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one receipt per trade
  UNIQUE(trade_id)
);

-- Engine events (audit log)
CREATE TABLE IF NOT EXISTS engine_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  ticker TEXT,
  duration_ms INTEGER,
  reason_code TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learn why cache (cached AI explanations)
CREATE TABLE IF NOT EXISTS learn_why_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  status TEXT NOT NULL,
  explanation TEXT NOT NULL,
  bullets JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  UNIQUE(ticker, status)
);

-- Add JSONB columns to existing trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS ai_consensus JSONB;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS regime_data JSONB;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS risk_data JSONB;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS bullets JSONB;

-- Enable RLS
ALTER TABLE trade_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learn_why_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own receipts" ON trade_receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert receipts" ON trade_receipts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own events" ON engine_events FOR SELECT USING (TRUE);
CREATE POLICY "System can insert events" ON engine_events FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Anyone can read cache" ON learn_why_cache FOR SELECT USING (TRUE);
CREATE POLICY "System can manage cache" ON learn_why_cache FOR ALL USING (TRUE);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_engine_events_correlation ON engine_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_engine_events_stage ON engine_events(stage);
CREATE INDEX IF NOT EXISTS idx_trade_receipts_ticker ON trade_receipts(ticker);
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON trades(user_id, status);
