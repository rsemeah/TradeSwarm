# TradeSwarm — Go/No-Go Decision Record
**Task:** T26 | **Division:** Research + Ro
**Status:** ⏳ PENDING — requires 30-trade paper run (T25) + metric evaluation (T23)

---

## ⚠️ THIS DOCUMENT IS NOT SIGNED

This is the template for the go/no-go decision record.
It will be completed after T25 (30-trade paper run) and T23 (metrics reader) are done.
Ro must sign before T27 (deploy to Vercel) begins.

---

## Decision

```
Decision:    [ GO / NO-GO ]  ← to be filled after T25 + T23
Date:        YYYY-MM-DD
Signed:      Ro (Rory Semeah)
Trade count: XX / 30 minimum
```

---

## Metrics at Decision Time

| Metric | Threshold | Actual | Pass? |
|--------|-----------|--------|-------|
| Win rate | ≥ 52% | — | ⏳ |
| Sharpe ratio (annualized) | ≥ 1.0 | — | ⏳ |
| Maximum drawdown | ≤ 15% | — | ⏳ |
| TruthSerum PASS rate | ≥ 95% | — | ⏳ |
| Average win / average loss | ≥ 1.3 | — | ⏳ |
| Halal gate false positive rate | 0% | — | ⏳ |
| Deliberation consensus | ≥ 60% | — | ⏳ |

---

## Required Confirmations Before Signing

- [ ] T23 metrics reader has run against ≥ 30 TruthCal™ receipts
- [ ] T24 halal 100-ticker audit complete — zero false positives
- [ ] T25 paper run: 30 receipts exist in Supabase `trade_receipts`
- [ ] T28 observability dashboard is live
- [ ] T29 kill switch tested and confirmed working
- [ ] Capital War Room monitoring active (CW-02 done)
- [ ] No hard stop conditions triggered during paper run
- [ ] Polygon.io key rotated (T13 done)
- [ ] Yahoo Finance unreachable from engine (grep confirmed)

---

## Hard Stop Check

Confirm none of the following triggered during paper run:

- [ ] Win rate < 48% AND Sharpe < 0.5 at 30-trade mark
- [ ] Max drawdown hit 20% at any point
- [ ] TruthSerum PASS rate dropped below 80% in any sprint
- [ ] Any HARAM ticker passed halal gate

---

## Supabase Receipt Link

```
Project: endovljmaudnxdzdapmf
Table: trade_receipts
Filter: created_at > [paper_run_start_date]
Count: [XX] receipts
Link: https://app.supabase.com/project/endovljmaudnxdzdapmf/editor
```

---

## Notes / Conditions

```
[To be filled at decision time]
```

---

*Ro's signature on this document is the only valid go/no-go gate.  
No agent can sign on Ro's behalf. No shortcut. Prove it on $2k.*
