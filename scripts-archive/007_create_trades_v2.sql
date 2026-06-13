-- Trades table for executed and simulated trades
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  strategy TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('bullish', 'bearish')),
  status TEXT NOT NULL CHECK (status IN ('executed', 'simulated', 'watching')),
  amount DECIMAL(10,2) NOT NULL,
  entry_price DECIMAL(10,2),
  exit_price DECIMAL(10,2),
  trust_score INTEGER NOT NULL CHECK (trust_score >= 0 AND trust_score <= 100),
  win_likelihood INTEGER CHECK (win_likelihood >= 0 AND win_likelihood <= 100),
  outcome TEXT CHECK (outcome IN ('win', 'loss', 'pending', 'cancelled')),
  pnl DECIMAL(10,2),
  theme TEXT,
  rationale TEXT,
  risk_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  expiration_days INTEGER
);

-- Enable RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "trades_select_own" ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trades_insert_own" ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades_update_own" ON trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trades_delete_own" ON trades FOR DELETE USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_created_at ON trades(created_at DESC);
