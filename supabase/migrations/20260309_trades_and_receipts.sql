-- Migration: 20260309_trades_and_receipts
--
-- Defines the canonical `trades` table (engine runtime table — written by the
-- orchestrator / runTradeSwarm / runCanonicalTrade) and the `trade_receipts`
-- audit-trail table.
--
-- Column set is derived directly from actual insert statements in:
--   lib/engine/orchestrator.ts
--   lib/engine/runTradeSwarm.ts
--   lib/engine/runCanonicalTrade.ts
--
-- IMPORTANT:  `trades_v2` is the journal / outcome-tracking table (already in
-- supabase/migrations/20260228_trades_v2.sql).  This file covers the engine's
-- execution-time table.  The two tables have a 1-to-1 relationship via FK on
-- trades_v2.trade_id (to be added in a subsequent migration once the engine
-- migration is complete).

-- ─── trades ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trades (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker       TEXT NOT NULL,
  -- Execution metadata
  strategy     TEXT,                              -- e.g. "options_spread"
  action       TEXT,                              -- "preview" | "simulate" | "execute"
  status       TEXT,                              -- "executed" | "simulated" | "pending"
  is_paper     BOOLEAN DEFAULT TRUE,
  amount       NUMERIC(15, 2),
  trust_score  INTEGER,
  -- Narrative
  rationale    TEXT,
  reasoning    TEXT,
  -- AI bundles (JSONB — stored as-is from engine output)
  ai_consensus JSONB,
  regime_data  JSONB,
  risk_data    JSONB,
  -- Outcome fields (written by outcome-tracker job)
  outcome      TEXT CHECK (outcome IN ('open', 'win', 'loss', 'breakeven')),
  exit_price   NUMERIC(15, 4),
  pnl          NUMERIC(15, 2),
  win_likelihood NUMERIC(5, 4),
  -- Timestamps
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  closed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS trades_user_id_idx    ON trades (user_id);
CREATE INDEX IF NOT EXISTS trades_created_at_idx ON trades (created_at DESC);
CREATE INDEX IF NOT EXISTS trades_status_idx     ON trades (status);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trades_select_own" ON trades FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "trades_insert_own" ON trades FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades_update_own" ON trades FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "trades_delete_own" ON trades FOR DELETE  USING (auth.uid() = user_id);

-- ─── trade_receipts ──────────────────────────────────────────────────────────
--
-- Column set covers both execution paths:
--
--   Canonical path  (orchestrator.ts / runCanonicalTrade.ts):
--     request_id, proof_bundle, proof_bundle_version, final_verdict,
--     regime_trend, risk_level, engine_degraded, warnings,
--     engine_started_at, engine_completed_at
--
--   Legacy runTradeSwarm path (runTradeSwarm.ts):
--     ai_consensus, regime_snapshot, risk_snapshot, executed_at

CREATE TABLE IF NOT EXISTS trade_receipts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Deduplication
  request_id            TEXT,
  idempotency_key       TEXT,
  -- Relations
  trade_id              UUID REFERENCES trades(id) ON DELETE SET NULL,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Trade context
  ticker                TEXT,
  action                TEXT,     -- "preview" | "simulate" | "execute"
  amount                NUMERIC(15, 2),
  trust_score           INTEGER,
  -- Canonical proof bundle (orchestrator / runCanonicalTrade)
  proof_bundle          JSONB,
  proof_bundle_version  TEXT,
  final_verdict         TEXT,     -- "GO" | "NO" | "WAIT"
  regime_trend          TEXT,
  risk_level            TEXT,
  engine_degraded       BOOLEAN DEFAULT FALSE,
  warnings              JSONB DEFAULT '[]'::JSONB,
  engine_started_at     TIMESTAMPTZ,
  engine_completed_at   TIMESTAMPTZ,
  -- Legacy columns (runTradeSwarm path — kept for back-compat)
  ai_consensus          JSONB,
  regime_snapshot       JSONB,
  risk_snapshot         JSONB,
  executed_at           TIMESTAMPTZ,
  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS trade_receipts_idempotency_key_uq
  ON trade_receipts (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS trade_receipts_trade_id_idx   ON trade_receipts (trade_id);
CREATE INDEX IF NOT EXISTS trade_receipts_user_id_idx    ON trade_receipts (user_id);
CREATE INDEX IF NOT EXISTS trade_receipts_created_at_idx ON trade_receipts (created_at DESC);

ALTER TABLE trade_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipts_select_own" ON trade_receipts FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "receipts_insert_own" ON trade_receipts FOR INSERT  WITH CHECK (auth.uid() = user_id);

-- ─── market_snapshots ────────────────────────────────────────────────────────
-- Written by runCanonicalTrade.persistMarketSnapshot for determinism tracking.

CREATE TABLE IF NOT EXISTS market_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_hash TEXT NOT NULL,
  snapshot      JSONB NOT NULL,
  source        TEXT,
  as_of         TIMESTAMPTZ,
  latency_ms    INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS market_snapshots_hash_uq ON market_snapshots (snapshot_hash);

-- ─── trade_replay_reports ────────────────────────────────────────────────────
-- Written by the replay engine; queried by enforceReplayPolicy and
-- institutionalValidation to gate execution.

CREATE TABLE IF NOT EXISTS trade_replay_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id       UUID REFERENCES trades(id) ON DELETE SET NULL,
  receipt_id     UUID REFERENCES trade_receipts(id) ON DELETE SET NULL,
  match          BOOLEAN NOT NULL,
  engine_version TEXT,
  diff           JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trade_replay_reports_created_at_idx ON trade_replay_reports (created_at DESC);
