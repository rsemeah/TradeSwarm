# TradeSwarm Sprint Plan
**Version:** 1.0 | **Date:** 2026-06-10 | **Target:** T33 LIVE — Q3 2026

---

## Dependency Chain
```
CW-05 (GitHub commit) → T01 (schema) → T02 (TruthSerum wired) → T03 (tests pass)
→ T04 (Polygon live, Yahoo gone) → Sprint 1 gate
→ [Phase 0 concurrent] → Sprint 2 begins
→ T11 (Alpaca confirmed) → T16 (HMM audited) → Sprint 2 gate
→ T25 (30-trade paper run — TIME GATE) → T26 (go/no-go) → T28 + T29 → T33 (LIVE)
```

---

## Pre-Phase: SwarmClaw Infrastructure (gate before Phase 0)

| ID | Task | DoD |
|----|------|-----|
| SC-01 | Rename DATA agent → DB | routing_log updated |
| SC-02 | Promote TRUTH agent → Capital CRO-tier | ROBBY routing table updated |
| SC-03 | Fast path rules (Execution bypasses ROBBY) | REDLANTERN_CAPITAL_ORG.md written |
| SC-04 | T-prefix namespace in routing_log | T-prefix = Capital, P-prefix = Build Co |

---

## Phase 0: Capital War Room Standup (concurrent with Sprint 1)

| ID | Task | DoD |
|----|------|-----|
| CW-01 | REDLANTERN_CAPITAL_ORG.md | Written, committed, Ro reviewed |
| CW-02 | 7 Division Directors in SwarmClaw | Configs in swarmclaw/agents/capital/ |
| CW-03 | #capital channel | Channel exists, all Capital agents namespaced |
| CW-04 | TruthSerum wired as mandatory gate | Smoke test: FAIL on bad input, PASS on valid |
| CW-05 | GitHub commit verified | git status clean, all files in history ✅ |

---

## Sprint 1 — UNBLOCK

**Gate: TruthSerum PASS on synthetic valid trade. Engine on Polygon. Yahoo gone. Files in GitHub.**

| ID | Task | Status | DoD |
|----|------|--------|-----|
| T01 | Fix schema drift | ⚠️ UNKNOWN | supabase db push clean, single migration source |
| T02 | TruthSerum wired to orchestrator | ⚠️ NOT WIRED | orchestrator.ts imports validateWithTruthSerum. Smoke test passes. |
| T03 | TruthSerum tests pass | ✅ WRITTEN | npx jest services/truthserum/truthserum.test.ts — all pass |
| T04 | Polygon adapter live, Yahoo gone | ✅ WRITTEN | grep confirms no yahoo imports in engine |
| T05 | CCXT crypto adapter | ✅ WRITTEN | getCryptoBars('BTC') returns OHLCV array |
| T06 | PROJECT_CHARTER.md | ✅ DONE | — |
| T07 | SPRINT_PLAN.md | ✅ DONE | — |
| T08 | BUSINESS_CASE.md | 🔧 IN PROGRESS | Legal positioning + failure conditions |
| T09 | DATA_MANIFEST.md | ✅ DONE | — |
| T10 | FEATURE_MANIFEST.md | ❌ MISSING | Complete after T16 HMM audit |

**Sprint 1 gate checklist:**
- [ ] TruthSerum smoke test: PASS on valid synthetic, FAIL on Yahoo/stale
- [ ] grep -r "yahoo" lib/engine/ src/lib/ → zero results
- [ ] supabase db push clean on branch
- [ ] git status clean (CW-05)
- [ ] getQuote('AAPL') returns < 2s with fresh timestamp

---

## Sprint 2 — BUILD

**Gate: Full pipeline smoke test. TruthCal™ receipt in Supabase. HMM status known.**

| ID | Task | Status | DoD |
|----|------|--------|-----|
| T11 | Alpaca keys confirmed + tested | ⚠️ UNTESTED | getAccount() returns PA3WMCEDJJS data |
| T12 | Coinbase keys confirmed + tested | ⚠️ UNTESTED | isHealthy() returns true |
| T13 | Polygon.io key rotated + injected | 🚨 PENDING RO | New key in .env — do NOT use exposed key |
| T14 | FRED API macro features | ❌ MISSING | Fed Funds Rate + T10Y2Y retrievable |
| T15 | Halal screen route audit | ❌ MISSING | Ratio-based screening confirmed |
| T16 | HMM training audit | ❌ MISSING | VERIFIED: trained or not. Features documented. |
| T17 | GROQ deliberation prompt audit | ❌ MISSING | Structured JSON output confirmed |
| T18 | Model version hash in TruthCal™ | ❌ MISSING | Receipt schema includes modelVersions field |
| T19 | IBroker interface | ✅ DONE | lib/brokers/types.ts |
| T20 | Alpaca broker adapter | ✅ WRITTEN | Depends on T11 |
| T21 | Coinbase adapter | ✅ WRITTEN | Depends on T12 |

**Sprint 2 gate checklist:**
- [ ] Full pipeline: scanner → TruthSerum → deliberation → TruthCal™ receipt in Supabase
- [ ] Both brokers: getAccount() and isHealthy() return real data
- [ ] HMM: training status VERIFIED, MODEL_CARD.md complete
- [ ] Halal gate: ratio-based confirmed

---

## Sprint 3 — PROVE AND LAUNCH

**Gate: GO_NOGO_DECISION.md signed by Ro. T28 + T29 done before T33.**

| ID | Task | Status | DoD |
|----|------|--------|-----|
| T22 | Go/no-go criteria | ✅ DONE | docs/EVALUATION_CRITERIA.md |
| T23 | Metrics reader on TruthCal™ receipts | ❌ MISSING | Win rate, Sharpe, drawdown from Supabase |
| T24 | Halal gate 100-ticker audit | ❌ MISSING | 0 false positives documented |
| T25 | 30-trade paper run | ❌ TIME GATE | 30 receipts in Supabase. Cannot compress. |
| T26 | Go/no-go decision | ❌ MISSING | All metrics vs thresholds. Ro signs. |
| T27 | Deploy to Vercel | ❌ MISSING | Production live |
| T28 | Observability dashboard | ❌ MISSING | P&L, drawdown, regime, TruthSerum metrics. **REQUIRED BEFORE T33** |
| T29 | Manual kill switch | ❌ MISSING | Kills all open orders. Tested. **REQUIRED BEFORE T33** |
| T30 | HMM retraining trigger | ❌ MISSING | Threshold or schedule in MODEL_CARD.md |
| T31 | Halal compliance log | ❌ MISSING | Alif-ready. Scholar review gate required. |
| T32 | Final pre-live audit | ❌ MISSING | All CPMAI phases signed off |
| T33 | Flip ALPACA_PAPER=false | ❌ HARD GATE | T28 + T29 + T26 + Ro approval required |

---

*Hard gates are non-negotiable. Do not ask Ro to skip.*
