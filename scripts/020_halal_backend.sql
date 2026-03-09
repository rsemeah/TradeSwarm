-- 020_halal_backend.sql
-- Migration: Halal backend (partial/imported)
-- NOTE: trimmed for integration; run a DB review before applying to production.

-- ENUMS
CREATE TYPE IF NOT EXISTS truth_status        AS ENUM ('VERIFIED','STUBBED','MISSING');
CREATE TYPE IF NOT EXISTS sharia_standard     AS ENUM ('AAOIFI','DJIM','CUSTOM');
CREATE TYPE IF NOT EXISTS screen_freshness    AS ENUM ('FRESH','STALE','MISSING','EXPIRED');
CREATE TYPE IF NOT EXISTS compliance_decision AS ENUM ('PASS','FAIL','CONTESTED_REQUIRES_OVERRIDE');
CREATE TYPE IF NOT EXISTS block_type          AS ENUM ('INDUSTRY','FINANCIAL','INSTRUMENT','DATA_MISSING');
CREATE TYPE IF NOT EXISTS portfolio_intent    AS ENUM (
  'INITIATE_POSITION','ADD_TO_POSITION','REDUCE_POSITION','EXIT_POSITION','REBALANCE','REPLACE_DISQUALIFIED_HOLDING','ROTATE_DEFENSIVE','ALLOCATE_GOLD_SLEEVE','MOVE_TO_CASH','DEFER'
);
CREATE TYPE IF NOT EXISTS intent_status       AS ENUM (
  'PROPOSED','COMPLIANCE_PENDING','COMPLIANCE_PASSED','COMPLIANCE_FAILED','CAPITAL_PENDING','QUEUED_PAPER','EXECUTED_PAPER','CANCELLED'
);

-- Example: minimal table used by the halal service. Full schema is in the original attachment.
CREATE TABLE IF NOT EXISTS sharia_profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  standard sharia_standard NOT NULL,
  truth_status truth_status NOT NULL DEFAULT 'STUBBED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sharia_profiles_user ON sharia_profiles(user_id);

-- NOTE: This migration is intentionally minimal. Use the provided 20260308_halal_backend.sql as canonical source when applying to a real DB.
