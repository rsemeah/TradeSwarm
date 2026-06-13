-- Add JSONB columns to trades table for V1 engine data
-- Run this in Supabase SQL Editor

-- Add AI consensus, regime, and risk JSONB columns to trades
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS ai_consensus JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS regime_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS risk_data JSONB DEFAULT NULL;

-- Add simulations_completed to portfolio_stats
ALTER TABLE portfolio_stats
ADD COLUMN IF NOT EXISTS simulations_completed INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_trades INT DEFAULT 0;

-- Create trade_receipts table if not exists (with JSONB columns)
CREATE TABLE IF NOT EXISTS trade_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID REFERENCES trades(id),
  user_id UUID REFERENCES auth.users(id),
  ticker VARCHAR(10) NOT NULL,
  action VARCHAR(20) NOT NULL, -- execute, simulate
  amount DECIMAL(12,2),
  trust_score INT,
  ai_consensus JSONB, -- { groq: {...}, openai: {...}, finalVerdict: "GO" }
  regime_snapshot JSONB, -- { trend: "bullish", volatility: "low", momentum: "strong" }
  risk_snapshot JSONB, -- { maxLoss: 100, expectedReturn: 50, confidence: 0.75 }
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on trade_receipts
ALTER TABLE trade_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies for trade_receipts
CREATE POLICY "Users can view own receipts" ON trade_receipts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts" ON trade_receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create engine_events table for health monitoring
CREATE TABLE IF NOT EXISTS engine_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- analysis, trade, error, health_check
  ticker VARCHAR(10),
  user_id UUID REFERENCES auth.users(id),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on engine_events
ALTER TABLE engine_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for engine_events (users see their own, admins see all)
CREATE POLICY "Users can view own events" ON engine_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON engine_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_ai_consensus ON trades USING GIN (ai_consensus);
CREATE INDEX IF NOT EXISTS idx_trades_regime_data ON trades USING GIN (regime_data);
CREATE INDEX IF NOT EXISTS idx_trade_receipts_user ON trade_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_receipts_ticker ON trade_receipts(ticker);
CREATE INDEX IF NOT EXISTS idx_engine_events_type ON engine_events(event_type);
CREATE INDEX IF NOT EXISTS idx_engine_events_created ON engine_events(created_at);

-- Comment for documentation
COMMENT ON COLUMN trades.ai_consensus IS 'JSONB storing AI model responses and consensus data';
COMMENT ON COLUMN trades.regime_data IS 'JSONB storing market regime snapshot at trade time';
COMMENT ON COLUMN trades.risk_data IS 'JSONB storing risk simulation results';
