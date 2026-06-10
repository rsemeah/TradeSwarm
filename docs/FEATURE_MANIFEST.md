# TradeSwarm — Feature Manifest
**Version:** 1.0-DRAFT | **Date:** 2026-06-10 | **Owner:** Data Division
**Task:** T10 | **Status:** DRAFT — T16 (HMM training audit) required to complete HMM feature section

---

## ⚠️ AUDIT DEPENDENCY

This manifest cannot be fully completed until **T16 (HMM training audit)** verifies:
- Which features are actually used as HMM inputs
- Training data window and source
- Feature engineering pipeline

Sections marked `[T16 REQUIRED]` are placeholders pending audit.

---

## Feature Categories

### 1. Price & Returns Features

| Feature | Source | Freshness SLA | Status |
|---------|--------|--------------|--------|
| Daily close price | Polygon.io (T04) | End of day | ✅ Available after T04 |
| Intraday OHLCV | Polygon.io (T04) | 15-min delay (free tier) | ✅ Available after T04 |
| Daily returns | Derived from close | Same as price | ✅ Computable |
| Log returns | Derived | Same as price | ✅ Computable |
| Rolling returns (5d, 20d, 60d) | Derived | Daily | ✅ Computable |

### 2. Volatility Features

| Feature | Source | Freshness SLA | Status |
|---------|--------|--------------|--------|
| Realized volatility (20d) | Derived from returns | Daily | ✅ Computable |
| ATR (Average True Range) | Derived from OHLCV | Daily | ✅ Computable |
| VIX (implied vol proxy) | Polygon.io | Daily | ✅ Available after T04 |
| GARCH volatility | Derived | Daily | ❌ Not yet implemented |

### 3. Volume Features

| Feature | Source | Freshness SLA | Status |
|---------|--------|--------------|--------|
| Daily volume | Polygon.io (T04) | End of day | ✅ Available after T04 |
| Volume ratio (vs 20d avg) | Derived | Daily | ✅ Computable |
| On-Balance Volume (OBV) | Derived | Daily | ✅ Computable |

### 4. Macro Features (T14 — MISSING)

| Feature | Source | Freshness SLA | Status |
|---------|--------|--------------|--------|
| Fed Funds Rate | FRED API (T14) | Monthly | ❌ T14 not implemented |
| 10Y-2Y Treasury Spread | FRED API (T14) | Daily | ❌ T14 not implemented |
| Credit spreads (HY-IG) | FRED API (T14) | Daily | ❌ T14 not implemented |
| CPI (inflation) | FRED API (T14) | Monthly | ❌ T14 not implemented |

### 5. Crypto Features (T05 — CCXT)

| Feature | Source | Freshness SLA | Status |
|---------|--------|--------------|--------|
| Crypto OHLCV | CCXT adapter (T05) | 1-min | ✅ Available after T05 |
| Funding rates | CCXT / exchange API | 8-hour | ❌ FundingRate Agent (Phase 7 Tier 1) |
| Liquidation data | Exchange API | Real-time | ❌ LiquidationHeatmap Agent (Phase 7 Tier 1) |

---

## HMM Regime Classifier Inputs [T16 REQUIRED]

**⚠️ The following is ASSUMED based on common HMM implementations. T16 must verify the actual inputs in `lib/regime/hmm.ts`.**

| Feature | Used in HMM? | Notes |
|---------|-------------|-------|
| Log returns | [T16 REQUIRED] | Standard HMM input |
| Realized volatility | [T16 REQUIRED] | Standard HMM input |
| Volume ratio | [T16 REQUIRED] | Common HMM input |
| Macro features | [T16 REQUIRED] | Unknown — depends on training data |
| Training data window | [T16 REQUIRED] | Must confirm: 1yr? 5yr? |
| Number of hidden states | [T16 REQUIRED] | Typically 2-4 regimes |
| Training source | [T16 REQUIRED] | Historical data provider unknown |

**T10 is BLOCKED on T16. Complete T16 first, then update this manifest.**

---

## GROQ Deliberation Inputs

| Input | Format | Source |
|-------|--------|--------|
| Ticker symbol | String | Scanner pipeline |
| Current price | Float | Polygon.io |
| Regime classification | Enum (bull/bear/sideways/high-vol) | HMM output |
| Technical signal | Buy/Sell/Hold | Scanner output |
| Halal verdict | HALAL/HARAM/UNKNOWN | Halal gate |
| Kelly fraction | Float (0-1) | Derived from receipt history |

Output format: [T17 REQUIRED] — structured JSON expected

---

## TruthSerum Validation Inputs

| Input | Rule | Blocks if... |
|-------|------|--------------|
| Data source | Must not be Yahoo Finance | `UNTRUSTED_DATA_SOURCE` |
| Data freshness | Must be < staleness threshold | `STALE_DATA` |
| Halal verdict (when HALAL_MODE=true) | Must be HALAL | `HALAL_VIOLATION` |
| Deliberation consensus | Must be ≥ 60% | `LOW_CONSENSUS` |
| Safety gate results | All must pass | `SAFETY_GATE_FAIL` |

---

*Update this manifest after T16 completes. T10 DoD requires HMM feature inputs documented and verified.*
