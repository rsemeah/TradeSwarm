-- Engine events for tracking AI analysis and system actions
CREATE TABLE IF NOT EXISTS engine_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'analysis_started', 'analysis_completed', 'analysis_failed',
    'trade_executed', 'trade_simulated', 'trade_cancelled',
    'watchlist_added', 'watchlist_removed',
    'gate_passed', 'gate_failed',
    'consensus_reached', 'consensus_split'
  )),
  ticker TEXT,
  theme TEXT,
  payload JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE engine_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own events
CREATE POLICY "events_select_own" ON engine_events 
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- System can insert events
CREATE POLICY "events_insert_all" ON engine_events 
  FOR INSERT WITH CHECK (true);

-- Indexes for analytics
CREATE INDEX idx_events_user_id ON engine_events(user_id);
CREATE INDEX idx_events_type ON engine_events(event_type);
CREATE INDEX idx_events_ticker ON engine_events(ticker);
CREATE INDEX idx_events_created_at ON engine_events(created_at DESC);
