# TradeSwarm — Evaluation Criteria & Go/No-Go Gate
**Version:** 1.0
**Date:** 2026-06-10
**Owner:** Research Division → Risk Division gate
**Task:** T22 / T26

---

## Purpose
All criteria below must pass before `ALPACA_PAPER=false` is set (T33).
Ro signs `GO_NOGO_DECISION.md` only after every threshold is met.

---

## Go/No-Go Thresholds (all required)

| Metric | Threshold | Measurement Method |
|--------|-----------|-------------------|
| Win rate | ≥ 52% | TruthCal™ receipt count: wins / total |
| Sharpe ratio (annualized) | ≥ 1.0 | T23 metrics reader at 30-trade mark |
| Maximum drawdown | ≤ 15% of bankroll | T23 continuous monitoring |
| TruthSerum PASS rate | ≥ 95% | Per-sprint audit of gate verdicts |
| Average win / average loss | ≥ 1.3 | Receipt P&L analysis |
| Halal false positive rate | 0% — zero HARAM tickers passed | T24 100-ticker audit |
| Deliberation consensus | ≥ 60% average | GROQ multi-model agreement rate |

---

## Hard Stop Conditions

- Win rate < 48% AND Sharpe < 0.5 after 30 trades → pause, review HMM + deliberation
- Max drawdown hits 20% → kill paper run, full investigation
- TruthSerum PASS rate < 80% → architecture problem, do not proceed
- Any HARAM ticker passes halal gate → fix before Alif submission

---

## Minimum Paper Run

**30 trades minimum — hard gate, cannot be compressed.**
Each trade = one TruthCal™ receipt in Supabase.

---

## Kelly Calibration

- Half-Kelly maximum until T26: no position > $500
- Full Kelly only after 30-trade paper run confirms Sharpe ≥ 1.0
- Kelly fraction = (edge / odds) × 0.5

---

## GO_NOGO_DECISION.md Must Contain

1. Final metrics vs thresholds (all 7)
2. Hard stop conditions: none triggered
3. 30-trade receipt Supabase link
4. Ro signature + timestamp
5. War room active (CW-02 done)
6. Kill switch tested (T29 done)
7. Dashboard live (T28 done)

Ro signature is mandatory. No agent can sign on Ro's behalf.

---

*No gate skipped. No threshold waived. Prove it on $2k.*
