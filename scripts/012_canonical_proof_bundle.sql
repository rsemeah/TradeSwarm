-- ============================================================
-- 012_canonical_proof_bundle.sql
-- Hard-cut to canonical proof-bundle schema.
-- Decision: Hard cut (not additive backfill).
-- Drops legacy trade_receipts and engine_events and recreates
-- both with the canonical structure required by the orchestrator.
-- ============================================================

-- ── engine_events (hard cut + recreate) ────────────────────────────────────

DROP TABLE IF EXISTS engine_events CASCADE;

CREATE TABLE engine_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID,                                         -- orchestration run ID
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL,                         -- canonical name: REGIME_DONE, RISK_DONE, …
  stage       TEXT        NOT NULL,                         -- preflight | regime | risk | deliberation | scoring | persist
  status      TEXT        NOT NULL CHECK (status IN ('ok', 'degraded', 'error', 'blocked')),
  ticker      TEXT,
  payload     JSONB       DEFAULT '{}',
  duration_ms INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE engine_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_own" ON engine_events
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "events_insert_all" ON engine_events
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_ev_request_id  ON engine_events(request_id);
CREATE INDEX idx_ev_user_id     ON engine_events(user_id);
CREATE INDEX idx_ev_name        ON engine_events(name);
CREATE INDEX idx_ev_ticker      ON engine_events(ticker);
CREATE INDEX idx_ev_created_at  ON engine_events(created_at DESC);

-- ── trade_receipts (hard cut + recreate) ───────────────────────────────────

DROP TABLE IF EXISTS trade_receipts CASCADE;

CREATE TABLE trade_receipts (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tracing / idempotency
  request_id           UUID        UNIQUE,                  -- one receipt per orchestration run
  trade_id             UUID        REFERENCES trades(id) ON DELETE SET NULL,
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Classification
  ticker               TEXT        NOT NULL,
  action               TEXT        NOT NULL CHECK (action IN ('execute', 'simulate', 'preview')),
  amount               DECIMAL(12,2),

  -- Canonical audit trail
  proof_bundle         JSONB       NOT NULL,
  proof_bundle_version TEXT        DEFAULT 'v1',

  -- Indexed convenience columns (derived from proof_bundle)
  final_verdict        TEXT        CHECK (final_verdict IN ('GO', 'WAIT', 'NO')),
  trust_score          INT,
  regime_trend         TEXT,
  risk_level           TEXT,
  engine_degraded      BOOLEAN     DEFAULT FALSE,
  warnings             TEXT[]      DEFAULT '{}',

  -- Timing
  engine_started_at    TIMESTAMPTZ,
  engine_completed_at  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trade_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipts_select_own" ON trade_receipts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "receipts_insert_own" ON trade_receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_rcpt_user_id      ON trade_receipts(user_id);
CREATE INDEX idx_rcpt_trade_id     ON trade_receipts(trade_id);
CREATE INDEX idx_rcpt_ticker       ON trade_receipts(ticker);
CREATE INDEX idx_rcpt_action       ON trade_receipts(action);
CREATE INDEX idx_rcpt_request_id   ON trade_receipts(request_id);
CREATE INDEX idx_rcpt_created_at   ON trade_receipts(created_at DESC);
CREATE INDEX idx_rcpt_proof_bundle ON trade_receipts USING GIN(proof_bundle);
