-- ============================================================
-- TradeSwarm — trade_stage_verdicts
-- Per-stage gate audit table for T33 queryable analysis
-- Migration: 20260614_trade_stage_verdicts.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS trade_stage_verdicts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id        UUID NOT NULL,                            -- = requestId from orchestrator
  trade_id      UUID REFERENCES trades_v2(id) ON DELETE SET NULL,
  stage         VARCHAR(50) NOT NULL,                     -- truthserum | halal | preflight | deliberation | scoring
  verdict       VARCHAR(20) NOT NULL,                     -- PASS | FAIL | WARN | SKIP | DEGRADED | BLOCKED
  score         NUMERIC(6, 4),                            -- normalized 0–1 where applicable
  reason        TEXT,
  meta          JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for T33 analytics queries
CREATE INDEX IF NOT EXISTS idx_tsv_run_id    ON trade_stage_verdicts(run_id);
CREATE INDEX IF NOT EXISTS idx_tsv_trade_id  ON trade_stage_verdicts(trade_id);
CREATE INDEX IF NOT EXISTS idx_tsv_stage     ON trade_stage_verdicts(stage);
CREATE INDEX IF NOT EXISTS idx_tsv_created   ON trade_stage_verdicts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tsv_verdict   ON trade_stage_verdicts(verdict);

-- ── T33 Gate Analytics View ─────────────────────────────────────────────────
-- Query this to check gate-by-gate pass rates against T33 thresholds
CREATE OR REPLACE VIEW t33_stage_summary AS
SELECT
  stage,
  verdict,
  COUNT(*)                       AS count,
  ROUND(AVG(score)::NUMERIC, 4)  AS avg_score,
  MIN(created_at)                AS first_at,
  MAX(created_at)                AS last_at
FROM trade_stage_verdicts
GROUP BY stage, verdict
ORDER BY stage, verdict;

-- ── T33 Per-Stage Pass Rate View ────────────────────────────────────────────
-- Quick check: "what % of truthserum runs are PASS?"
CREATE OR REPLACE VIEW t33_pass_rates AS
SELECT
  stage,
  COUNT(*) FILTER (WHERE verdict = 'PASS')  AS pass_count,
  COUNT(*) FILTER (WHERE verdict = 'FAIL')  AS fail_count,
  COUNT(*) FILTER (WHERE verdict = 'DEGRADED') AS degraded_count,
  COUNT(*) FILTER (WHERE verdict = 'BLOCKED')  AS blocked_count,
  COUNT(*)                                   AS total,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE verdict = 'PASS') / NULLIF(COUNT(*), 0),
    1
  )                                          AS pass_pct
FROM trade_stage_verdicts
GROUP BY stage
ORDER BY stage;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE trade_stage_verdicts ENABLE ROW LEVEL SECURITY;

-- Engine writes via service role (backend only — never from client)
CREATE POLICY "service_role_all"
  ON trade_stage_verdicts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read their own run verdicts
CREATE POLICY "user_read_own"
  ON trade_stage_verdicts
  FOR SELECT
  TO authenticated
  USING (
    run_id IN (
      SELECT request_id::UUID
      FROM trade_receipts
      WHERE user_id = auth.uid()
    )
  );
