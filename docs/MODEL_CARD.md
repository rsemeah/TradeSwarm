# TradeSwarm — Model Card
**Version:** 1.0-DRAFT | **Date:** 2026-06-10 | **Owner:** Research Division
**Status:** DRAFT — T16 (HMM training audit) and T17 (GROQ audit) required to finalize

---

## Models in Use

### 1. HMM Regime Classifier
- **File:** `lib/regime/hmm.ts`
- **Purpose:** Classifies market regime (bull / bear / sideways / high-vol)
- **Training status:** ⚠️ UNKNOWN — T16 required
- **Features:** UNKNOWN — T10 (FEATURE_MANIFEST) required after T16 audit
- **Training data window:** UNKNOWN — must be verified in T16
- **Retraining trigger:** UNKNOWN — T30 defines threshold or schedule
- **Audit flag:** Do not treat HMM output as verified until T16 completes

### 2. GROQ Multi-Model Deliberation
- **File:** `lib/engine/orchestrator.ts`
- **Purpose:** Multi-model consensus on trade signal before execution
- **Models used:** GROQ-hosted LLMs (specific models TBD — T17 required)
- **Output format:** UNKNOWN — structured JSON required, verify in T17
- **Timeout behavior:** UNKNOWN — must be defined in T17
- **Consensus threshold:** ≥ 60% (go/no-go KPI)
- **Audit flag:** Do not treat deliberation output as verified until T17 completes

### 3. Kelly Position Sizing
- **File:** `lib/engine/orchestrator.ts`
- **Purpose:** Sizes positions using Kelly criterion
- **Inputs:** Win rate + avg win/loss ratio (from TruthCal™ receipts)
- **Maximum:** Half-Kelly during paper run. No position > $500 until T26 passes.
- **Self-update:** KellyCalibrator Agent (Phase 7 Tier 1) handles post-T33

---

## TruthSerum Gate
- All model outputs pass through TruthSerum validator before execution
- TruthSerum PASS rate ≥ 95% required for go/no-go
- Bad input → FAIL verdict logged, trade blocked
- Gate is fail-closed: UNKNOWN = FAIL

## TruthCal™ Receipt Schema
- SHA-256 proof bundle per trade
- File: `lib/engine/runCanonicalTrade.ts`
- `modelVersions` field: ❌ MISSING — T18 required
- Receipts are immutable after T18 without Ro sign-off

## Halal Mode
- Toggleable via halal mode flag
- Fail-closed: UNKNOWN verdict = FAIL
- DJIM-compliant screening
- See `docs/HALAL_METHODOLOGY.md`

## Open Audit Items
| ID | Item | Task |
|----|------|------|
| T16 | HMM training status, features, data window | Research Director |
| T17 | GROQ prompt audit, output format, timeout | Research Director |
| T18 | Add modelVersions field to TruthCal™ receipt | Risk Director |
| T30 | HMM retraining trigger/schedule | Research Director |

*This card is incomplete until T16, T17, T18, T30 are resolved.*
