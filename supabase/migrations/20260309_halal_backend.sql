-- Migration: 20260309_halal_backend
-- Sharia-compliant trading infrastructure.
-- Source: scripts/20260308_halal_backend.sql
--
-- NOTE: sharia_receipts, purification_ledger, halal_trade_tags, and
-- compliance_drift_log reference trades(id).  When the engine is fully
-- migrated to trades_v2 these FKs should be updated in a subsequent migration.

-- 1. Sharia Profiles
CREATE TABLE IF NOT EXISTS sharia_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  standard                  TEXT NOT NULL DEFAULT 'AAOIFI'
                            CHECK (standard IN ('AAOIFI', 'DJIM', 'CUSTOM')),
  max_debt_ratio            NUMERIC(5, 4) NOT NULL DEFAULT 0.33,
  max_receivables_ratio     NUMERIC(5, 4) NOT NULL DEFAULT 0.49,
  max_haram_revenue_ratio   NUMERIC(5, 4) NOT NULL DEFAULT 0.05,
  allowed_sectors           TEXT[] DEFAULT ARRAY['technology','healthcare','industrials','consumer_goods'],
  blocked_sectors           TEXT[] DEFAULT ARRAY['alcohol','tobacco','gambling','weapons','adult_entertainment','conventional_finance'],
  require_purification      BOOLEAN DEFAULT TRUE,
  charity_destination       TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- 2. Halal Screens (H1–H4 business / financial ratio screening)
CREATE TABLE IF NOT EXISTS halal_screens (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id),
  ticker               TEXT NOT NULL,
  screen_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  -- H1: Business Activity
  h1_sector            TEXT,
  h1_haram_revenue_pct NUMERIC(5, 4),
  h1_pass              BOOLEAN,
  h1_evidence          JSONB,
  -- H2: Debt Ratio
  h2_total_debt        NUMERIC(20, 2),
  h2_market_cap        NUMERIC(20, 2),
  h2_debt_ratio        NUMERIC(5, 4),
  h2_pass              BOOLEAN,
  h2_evidence          JSONB,
  -- H3: Receivables / Assets
  h3_receivables       NUMERIC(20, 2),
  h3_total_assets      NUMERIC(20, 2),
  h3_receivables_ratio NUMERIC(5, 4),
  h3_pass              BOOLEAN,
  h3_evidence          JSONB,
  -- H4: Interest Income
  h4_interest_income   NUMERIC(20, 2),
  h4_total_revenue     NUMERIC(20, 2),
  h4_interest_ratio    NUMERIC(5, 4),
  h4_pass              BOOLEAN,
  h4_evidence          JSONB,
  -- Overall
  overall_pass         BOOLEAN,
  compliance_score     NUMERIC(5, 2),
  truth_status         TEXT DEFAULT 'STUBBED'
                       CHECK (truth_status IN ('VERIFIED', 'STUBBED', 'MISSING')),
  data_sources         JSONB,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_halal_screens_user_ticker ON halal_screens (user_id, ticker);
CREATE INDEX IF NOT EXISTS idx_halal_screens_date        ON halal_screens (screen_date);

-- 3. Halal Gates (H5–H7 pre-trade gates)
CREATE TABLE IF NOT EXISTS halal_gates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  screen_id           UUID REFERENCES halal_screens(id),
  ticker              TEXT NOT NULL,
  strategy_type       TEXT NOT NULL,
  -- H5: Position Limit
  h5_current_exposure NUMERIC(20, 2),
  h5_max_exposure     NUMERIC(20, 2),
  h5_pass             BOOLEAN,
  h5_evidence         JSONB,
  -- H6: Timing (0DTE gharar check)
  h6_is_0dte          BOOLEAN,
  h6_market_hours     BOOLEAN,
  h6_pass             BOOLEAN,
  h6_evidence         JSONB,
  -- H7: Intent Confirmation
  h7_user_confirmed   BOOLEAN DEFAULT FALSE,
  h7_confirmation_ts  TIMESTAMPTZ,
  h7_pass             BOOLEAN DEFAULT FALSE,
  overall_pass        BOOLEAN,
  gate_ts             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_halal_gates_user ON halal_gates (user_id);

-- 4. Halal Intents
CREATE TABLE IF NOT EXISTS halal_intents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id),
  gate_id               UUID REFERENCES halal_gates(id),
  ticker                TEXT NOT NULL,
  strategy_type         TEXT NOT NULL,
  direction             TEXT CHECK (direction IN ('LONG', 'SHORT')),
  notional_amount       NUMERIC(20, 2),
  understood_risks      BOOLEAN DEFAULT FALSE,
  accepted_purification BOOLEAN DEFAULT FALSE,
  intent_statement      TEXT,
  status                TEXT DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','CONFIRMED','EXECUTED','EXPIRED','CANCELLED')),
  expires_at            TIMESTAMPTZ,
  confirmed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_halal_intents_user_status ON halal_intents (user_id, status);

-- 5. Sharia Receipts (immutable compliance attestation)
CREATE TABLE IF NOT EXISTS sharia_receipts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id),
  trade_id               UUID REFERENCES trades(id),
  intent_id              UUID REFERENCES halal_intents(id),
  screen_snapshot        JSONB NOT NULL,
  gate_snapshot          JSONB NOT NULL,
  market_snapshot        JSONB NOT NULL,
  compliance_hash        TEXT NOT NULL,
  market_hash            TEXT NOT NULL,
  determinism_hash       TEXT NOT NULL,
  estimated_purification NUMERIC(20, 2) DEFAULT 0,
  purification_rate      NUMERIC(5, 4),
  attestation_level      TEXT CHECK (attestation_level IN ('FULL','PARTIAL','MANUAL_REVIEW')),
  scholar_notes          TEXT,
  truth_status           TEXT DEFAULT 'VERIFIED'
                         CHECK (truth_status IN ('VERIFIED','STUBBED','MISSING')),
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sharia_receipts_trade ON sharia_receipts (trade_id);

-- 6. Purification Ledger
CREATE TABLE IF NOT EXISTS purification_ledger (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id),
  trade_id             UUID REFERENCES trades(id),
  receipt_id           UUID REFERENCES sharia_receipts(id),
  ticker               TEXT NOT NULL,
  trade_pnl            NUMERIC(20, 2) NOT NULL,
  haram_ratio          NUMERIC(5, 4) NOT NULL,
  purification_amount  NUMERIC(20, 2) NOT NULL,
  status               TEXT DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING','DONATED','WRITTEN_OFF')),
  charity_destination  TEXT,
  donated_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purification_user_status ON purification_ledger (user_id, status);

-- 7. Halal Trade Tags
CREATE TABLE IF NOT EXISTS halal_trade_tags (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id               UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  screen_id              UUID REFERENCES halal_screens(id),
  gate_id                UUID REFERENCES halal_gates(id),
  receipt_id             UUID REFERENCES sharia_receipts(id),
  halal_status           TEXT DEFAULT 'COMPLIANT'
                         CHECK (halal_status IN ('COMPLIANT','QUESTIONABLE','NON_COMPLIANT','PENDING_REVIEW')),
  compliance_score       NUMERIC(5, 2),
  requires_purification  BOOLEAN DEFAULT FALSE,
  purification_amount    NUMERIC(20, 2) DEFAULT 0,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (trade_id)
);

-- 8. Compliance Drift Log
CREATE TABLE IF NOT EXISTS compliance_drift_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  trade_id        UUID REFERENCES trades(id),
  ticker          TEXT NOT NULL,
  drift_type      TEXT NOT NULL
                  CHECK (drift_type IN ('SECTOR_CHANGE','RATIO_BREACH','DELISTING','RESTATEMENT','MANUAL_FLAG')),
  drift_severity  TEXT CHECK (drift_severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  previous_status TEXT,
  new_status      TEXT,
  evidence        JSONB,
  action_required TEXT,
  action_taken    TEXT,
  resolved_at     TIMESTAMPTZ,
  detected_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_drift_user ON compliance_drift_log (user_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE sharia_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE halal_screens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE halal_gates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE halal_intents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharia_receipts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purification_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE halal_trade_tags   ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_drift_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sharia_profiles_own"     ON sharia_profiles     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "halal_screens_own"       ON halal_screens       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "halal_gates_own"         ON halal_gates         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "halal_intents_own"       ON halal_intents       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sharia_receipts_own"     ON sharia_receipts     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "purification_ledger_own" ON purification_ledger FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "compliance_drift_own"    ON compliance_drift_log FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "halal_trade_tags_own" ON halal_trade_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = halal_trade_tags.trade_id
        AND trades.user_id = auth.uid()
    )
  );
