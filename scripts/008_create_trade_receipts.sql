-- Trade receipts for detailed audit trail
CREATE TABLE IF NOT EXISTS trade_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- AI Analysis Results
  groq_analysis JSONB,
  openai_analysis JSONB,
  anthropic_analysis JSONB,
  consensus_result JSONB NOT NULL,
  
  -- Gate Results
  kelly_fraction DECIMAL(5,4),
  pop_estimate DECIMAL(5,4),
  expected_edge DECIMAL(5,4),
  cost_model JSONB,
  gate_results JSONB,
  
  -- Timestamps
  analysis_started_at TIMESTAMPTZ,
  analysis_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE trade_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "receipts_select_own" ON trade_receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "receipts_insert_own" ON trade_receipts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_receipts_trade_id ON trade_receipts(trade_id);
CREATE INDEX idx_receipts_user_id ON trade_receipts(user_id);
