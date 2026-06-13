-- Deterministic receipt envelope columns (additive, backward compatible)
ALTER TABLE trade_receipts
  ADD COLUMN IF NOT EXISTS input_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS market_snapshot_ref TEXT,
  ADD COLUMN IF NOT EXISTS engine_version TEXT,
  ADD COLUMN IF NOT EXISTS config_hash TEXT,
  ADD COLUMN IF NOT EXISTS determinism_hash TEXT,
  ADD COLUMN IF NOT EXISTS random_seed INT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE INDEX IF NOT EXISTS idx_trade_receipts_determinism_hash ON trade_receipts(determinism_hash);
CREATE INDEX IF NOT EXISTS idx_trade_receipts_market_snapshot_ref ON trade_receipts(market_snapshot_ref);
CREATE INDEX IF NOT EXISTS idx_trade_receipts_idempotency_key ON trade_receipts(idempotency_key);
