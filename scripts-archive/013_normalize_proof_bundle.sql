-- Normalize proof_bundle payload to v2 canonical contract.
ALTER TABLE trade_receipts
  ADD COLUMN IF NOT EXISTS proof_bundle JSONB;

UPDATE trade_receipts
SET proof_bundle = COALESCE(
  proof_bundle,
  jsonb_strip_nulls(
    jsonb_build_object(
      'version', 'v2',
      'model_provider', COALESCE(model_versions->>'provider', 'unknown'),
      'model_version', COALESCE(model_versions->>'model', 'unknown'),
      'regime_snapshot', COALESCE(regime, regime_snapshot),
      'risk_snapshot', COALESCE(risk, risk_snapshot),
      'safety_decision', jsonb_build_object(
        'safety_status', 'ALLOWED',
        'reason_code', NULL,
        'reasons', '[]'::jsonb,
        'max_size_hint', COALESCE(amount, 0)
      ),
      'model_rounds', COALESCE(deliberation, '[]'::jsonb),
      'consensus_score', COALESCE((scoring->>'agreementRatio')::numeric, 0),
      'trust_score', COALESCE(trust_score, (scoring->>'trustScore')::int, 0),
      'execution_mode', COALESCE(action, 'preview'),
      'timestamp', COALESCE(engine_completed_at::text, executed_at::text, NOW()::text),
      'input_snapshot', jsonb_build_object(
        'ticker', ticker,
        'requested_amount', COALESCE(amount, 0),
        'balance', 0,
        'safety_mode', 'unknown'
      ),
      'market_snapshot', jsonb_build_object(
        'quote', COALESCE(market_context->'quote', '{}'::jsonb),
        'chain', COALESCE(market_context->'chain', '{}'::jsonb),
        'provider_health', COALESCE(market_context->'providerHealth', '{}'::jsonb),
        'as_of', COALESCE(market_context->>'ts', NOW()::text)
      )
    )
  )
)
WHERE proof_bundle IS NULL
   OR NOT (proof_bundle ? 'version')
   OR NOT (proof_bundle ? 'model_provider')
   OR NOT (proof_bundle ? 'model_version')
   OR NOT (proof_bundle ? 'regime_snapshot')
   OR NOT (proof_bundle ? 'risk_snapshot')
   OR NOT (proof_bundle ? 'safety_decision')
   OR NOT (proof_bundle ? 'model_rounds')
   OR NOT (proof_bundle ? 'consensus_score')
   OR NOT (proof_bundle ? 'trust_score')
   OR NOT (proof_bundle ? 'execution_mode')
   OR NOT (proof_bundle ? 'timestamp')
   OR NOT (proof_bundle ? 'input_snapshot')
   OR NOT (proof_bundle ? 'market_snapshot');

CREATE INDEX IF NOT EXISTS idx_trade_receipts_proof_bundle_v2 ON trade_receipts USING GIN (proof_bundle);
