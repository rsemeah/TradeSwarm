# TradeSwarm — Evaluation Criteria & Go/No-Go Gate
**Version:** 1.0 | **Date:** 2026-06-10 | **Owner:** Research Division

## Go/No-Go Thresholds (all must pass before T33)

| Metric | Threshold | Hard Stop |
|--------|-----------|----------|
| Win rate | ≥ 52% | < 48% AND Sharpe < 0.5 → pause |
| Sharpe ratio (annualized) | ≥ 1.0 | — |
| Maximum drawdown | ≤ 15% of bankroll | ≥ 20% → kill paper run |
| TruthSerum PASS rate | ≥ 95% | < 80% → architecture problem, do not proceed |
| Average win / average loss | ≥ 1.3 | — |
| Halal gate false positive rate | 0 HARAM tickers passed | Any HARAM passes → fix before Alif submission |
| Deliberation consensus | ≥ 60% average | — |

## Minimum Trade Count
- **30 paper trades minimum** before go/no-go evaluation
- Time gate: cannot be compressed
- 30 TruthCal™ receipts must exist in Supabase

## Kelly Calibration
- Half-Kelly maximum during paper run
- No position > $500 until T26 go/no-go passes
- Kelly fraction inputs: win rate + avg win/loss ratio from TruthCal™ receipts
- KellyCalibrator Agent (Phase 7 Tier 1) will self-update after T33

## Evaluation Process
1. T23 metrics reader queries Supabase at 30-trade mark
2. All metrics calculated against thresholds above
3. Results written to GO_NOGO_DECISION.md
4. Ro reviews and signs GO_NOGO_DECISION.md
5. Signed doc = gate open for T27 (deploy)

## Hard Stops (build pauses, not just gate fails)
- Win rate < 48% AND Sharpe < 0.5 after 30 trades → pause, review HMM + deliberation
- Max drawdown hits 20% → kill paper run, investigate root cause
- TruthSerum PASS rate < 80% → architecture problem, do not proceed to Sprint 3
- Any HARAM ticker passes halal gate → fix before Alif submission

## Acceptance Criteria for This Document
- AC-07: T26 go/no-go signed by Ro before T27 (deploy) begins
- AC-09: Observability dashboard (T28) live before T33 executes
