# TradeSwarm — Model Card
**Version:** 1.0
**Date:** 2026-06-10
**Owner:** Research Division
**Tasks:** T16 (HMM audit), T17 (GROQ audit), T18 (model hash in TruthCal™)
**Status:** DRAFT — T16 and T17 audits REQUIRED to complete this card

---

## ⚠️ AUDIT FLAGS — Do Not Mark Complete Until Resolved

| Flag | Risk | Required Action |
|------|------|----------------|
| HMM training status UNKNOWN | HIGH | T16: Read `lib/regime/hmm.ts`, confirm trained/untrained, document features + window |
| GROQ output format UNKNOWN | HIGH | T17: Audit deliberation prompt, confirm structured JSON output, define timeout behavior |
| Model version hash MISSING from TruthCal™ | MEDIUM | T18: Add `modelVersions` field to receipt schema |

---

## Model 1: HMM Regime Classifier

**File:** `lib/regime/hmm.ts`
**Purpose:** Classifies current market regime (bull/bear/sideways/volatile)

### Training Status
- **Current status: UNKNOWN — T16 required**

### Feature Inputs (to be confirmed by T16)
- Returns, Volatility, Volume, Macro features (FRED — T14)
- **Documented inputs: UNKNOWN**

### Known Limitations
- Lagging indicator — not predictive
- Regime misclassification during rapid transitions is a known failure mode
- Must be retrained when regime drift detected (T30 threshold TBD)

---

## Model 2: GROQ Multi-Model Deliberation

**File:** `lib/engine/orchestrator.ts`
**Purpose:** Multi-model LLM consensus before execution

### Output Format
- **Current status: UNKNOWN — T17 required**

### Deliberation Threshold
- Minimum consensus: ≥ 60% of models agree
- Below threshold: signal REJECTED, TruthSerum FAIL

### Known Limitations
- Introduces latency — not suitable for HFT
- Prompt injection risk: inputs must be sanitized

---

## Model 3: Kelly Position Sizing

**File:** `lib/engine/orchestrator.ts`

```
kelly_fraction = (win_rate * avg_win - (1 - win_rate) * avg_loss) / avg_win
position_size = bankroll * kelly_fraction * 0.5  // half-Kelly
```

### Hard Limits
- No position > $500 during paper run
- No position > $500 during first 30 live trades post-T33

---

## TruthSerum Gate Integration

```
HMM regime → GROQ deliberation → Kelly sizing
                    ↓
           TruthSerum validation
                    ↓
           PASS → TruthCal™ receipt
           FAIL → signal rejected, logged
```

---

## Model Version Hashing (T18 — MISSING)

TruthCal™ receipts must include after T18:
```json
{
  "modelVersions": {
    "hmm": "<git-sha-of-hmm.ts>",
    "deliberation": "<groq-model-id>",
    "kelly": "<git-sha-of-orchestrator.ts>"
  }
}
```

*Complete T16 and T17 before marking this card VERIFIED.*
