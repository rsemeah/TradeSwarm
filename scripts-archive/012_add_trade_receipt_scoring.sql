-- Add deterministic scoring metadata payload to receipts
ALTER TABLE trade_receipts
ADD COLUMN IF NOT EXISTS scoring JSONB;

COMMENT ON COLUMN trade_receipts.scoring IS 'Full credibility scoring explanation including factors/penalties/boosts and formula metadata.';
