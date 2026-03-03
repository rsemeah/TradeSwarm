-- Cache for "Learn Why" explanations to avoid repeated AI calls
CREATE TABLE IF NOT EXISTS learn_why_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  strategy TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('GO', 'WAIT', 'NO')),
  explanation TEXT NOT NULL,
  eli5_explanation TEXT,
  key_factors JSONB,
  alternatives JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  
  -- Unique constraint for deduplication
  UNIQUE(ticker, strategy, status)
);

-- Enable RLS (public read for cache efficiency, but still need auth)
ALTER TABLE learn_why_cache ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read the cache
CREATE POLICY "cache_select_authenticated" ON learn_why_cache 
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only system can insert (via service role)
CREATE POLICY "cache_insert_service" ON learn_why_cache 
  FOR INSERT WITH CHECK (true);

-- Index for lookups
CREATE INDEX idx_learn_why_lookup ON learn_why_cache(ticker, strategy, status);
CREATE INDEX idx_learn_why_expires ON learn_why_cache(expires_at);
