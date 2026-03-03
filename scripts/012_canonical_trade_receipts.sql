-- Canonical trade receipt schema with backwards-compatible migration
ALTER TABLE trade_receipts
  ADD COLUMN IF NOT EXISTS ticker VARCHAR(10),
  ADD COLUMN IF NOT EXISTS action VARCHAR(20),
  ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS trust_score INT,
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS regime_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS risk_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS ai_consensus JSONB,
  ADD COLUMN IF NOT EXISTS consensus_result JSONB,
  ADD COLUMN IF NOT EXISTS gate_results JSONB,
  ADD COLUMN IF NOT EXISTS cost_model JSONB,
  ADD COLUMN IF NOT EXISTS groq_analysis JSONB,
  ADD COLUMN IF NOT EXISTS openai_analysis JSONB,
  ADD COLUMN IF NOT EXISTS anthropic_analysis JSONB,
  ADD COLUMN IF NOT EXISTS analysis_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analysis_completed_at TIMESTAMPTZ;

ALTER TABLE trade_receipts
  ADD COLUMN IF NOT EXISTS market_context JSONB,
  ADD COLUMN IF NOT EXISTS regime JSONB,
  ADD COLUMN IF NOT EXISTS risk JSONB,
  ADD COLUMN IF NOT EXISTS deliberation JSONB,
  ADD COLUMN IF NOT EXISTS scoring JSONB,
  ADD COLUMN IF NOT EXISTS model_versions JSONB,
  ADD COLUMN IF NOT EXISTS provenance JSONB,
  ADD COLUMN IF NOT EXISTS engine_timeline JSONB,
  ADD COLUMN IF NOT EXISTS schema_version INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS engine_version TEXT;

UPDATE trade_receipts
SET
  market_context = COALESCE(
    market_context,
    NULLIF(
      jsonb_strip_nulls(
        jsonb_build_object(
          'ticker', ticker,
          'action', action,
          'amount', amount,
          'trade_id', trade_id
        )
      ),
      '{}'::jsonb
    )
  ),
  regime = COALESCE(regime, regime_snapshot),
  risk = COALESCE(
    risk,
    NULLIF(
      jsonb_strip_nulls(
        jsonb_build_object(
          'snapshot', risk_snapshot,
          'gate_results', gate_results,
          'cost_model', cost_model,
          'kelly_fraction', kelly_fraction,
          'pop_estimate', pop_estimate,
          'expected_edge', expected_edge
        )
      ),
      '{}'::jsonb
    )
  ),
  deliberation = COALESCE(
    deliberation,
    NULLIF(
      jsonb_strip_nulls(
        jsonb_build_object(
          'ai_consensus', ai_consensus,
          'consensus_result', consensus_result,
          'analyses', jsonb_strip_nulls(
            jsonb_build_object(
              'groq', groq_analysis,
              'openai', openai_analysis,
              'anthropic', anthropic_analysis
            )
          )
        )
      ),
      '{}'::jsonb
    )
  ),
  scoring = COALESCE(
    scoring,
    NULLIF(
      jsonb_strip_nulls(
        jsonb_build_object(
          'trust_score', trust_score,
          'kelly_fraction', kelly_fraction,
          'pop_estimate', pop_estimate,
          'expected_edge', expected_edge
        )
      ),
      '{}'::jsonb
    )
  ),
  model_versions = COALESCE(
    model_versions,
    NULLIF(
      jsonb_strip_nulls(
        jsonb_build_object(
          'groq', ai_consensus->>'groqModel',
          'openai', ai_consensus->>'openaiModel',
          'anthropic', ai_consensus->>'anthropicModel',
          'engine', engine_version
        )
      ),
      '{}'::jsonb
    )
  ),
  provenance = COALESCE(
    provenance,
    NULLIF(
      jsonb_strip_nulls(
        jsonb_build_object(
          'source', 'legacy_migration',
          'receipt_id', id,
          'created_at', created_at,
          'user_id', user_id
        )
      ),
      '{}'::jsonb
    )
  ),
  engine_timeline = COALESCE(
    engine_timeline,
    NULLIF(
      jsonb_strip_nulls(
        jsonb_build_object(
          'analysis_started_at', analysis_started_at,
          'analysis_completed_at', analysis_completed_at,
          'executed_at', executed_at,
          'created_at', created_at
        )
      ),
      '{}'::jsonb
    )
  ),
  schema_version = COALESCE(schema_version, 2),
  engine_version = COALESCE(engine_version, 'v1-legacy')
WHERE
  market_context IS NULL
  OR regime IS NULL
  OR risk IS NULL
  OR deliberation IS NULL
  OR scoring IS NULL
  OR model_versions IS NULL
  OR provenance IS NULL
  OR engine_timeline IS NULL
  OR engine_version IS NULL
  OR schema_version IS NULL;

CREATE INDEX IF NOT EXISTS idx_trade_receipts_schema_version ON trade_receipts(schema_version);
CREATE INDEX IF NOT EXISTS idx_trade_receipts_engine_version ON trade_receipts(engine_version);
CREATE INDEX IF NOT EXISTS idx_trade_receipts_market_context ON trade_receipts USING GIN (market_context);

COMMENT ON COLUMN trade_receipts.market_context IS 'Canonical market context payload for receipt replay';
COMMENT ON COLUMN trade_receipts.regime IS 'Canonical market regime payload';
COMMENT ON COLUMN trade_receipts.risk IS 'Canonical risk payload';
COMMENT ON COLUMN trade_receipts.deliberation IS 'Canonical model deliberation payload';
COMMENT ON COLUMN trade_receipts.scoring IS 'Canonical scoring payload used for final decision';
COMMENT ON COLUMN trade_receipts.model_versions IS 'Model and engine versions used to generate the receipt';
COMMENT ON COLUMN trade_receipts.provenance IS 'Source metadata and lineage for the receipt payload';
COMMENT ON COLUMN trade_receipts.engine_timeline IS 'Engine runtime timestamps and milestones';
COMMENT ON COLUMN trade_receipts.schema_version IS 'Canonical receipt schema version';
COMMENT ON COLUMN trade_receipts.engine_version IS 'Engine runtime version for replay compatibility';
