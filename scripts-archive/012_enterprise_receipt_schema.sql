-- Enterprise canonical receipt envelope fields
ALTER TABLE trade_receipts
  ADD COLUMN IF NOT EXISTS envelope JSONB,
  ADD COLUMN IF NOT EXISTS market_context JSONB,
  ADD COLUMN IF NOT EXISTS regime JSONB,
  ADD COLUMN IF NOT EXISTS risk JSONB,
  ADD COLUMN IF NOT EXISTS deliberation JSONB,
  ADD COLUMN IF NOT EXISTS scoring JSONB,
  ADD COLUMN IF NOT EXISTS model_versions JSONB,
  ADD COLUMN IF NOT EXISTS provenance JSONB,
  ADD COLUMN IF NOT EXISTS engine_timeline JSONB,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT 'v1';

CREATE INDEX IF NOT EXISTS idx_trade_receipts_schema_version ON trade_receipts(schema_version);
