# TradeSwarm — AGENTS.md
**Version:** 1.0 | **Date:** 2026-06-10
**Purpose:** Defines what agents can and cannot touch in this repo.

---

## DO NOT TOUCH — Hard Rules

The following files and systems are off-limits for agent modification without Ro sign-off:

| Protected Area | Rule |
|---------------|------|
| `lib/engine/orchestrator.ts` — trading logic | Do not modify trade scoring, signal routing, or execution flow |
| `lib/engine/runCanonicalTrade.ts` — TruthCal™ receipts | Do not modify receipt structure after T18 without Ro sign-off |
| `services/truthserum/` — safety gates | Do not modify TruthSerum validation rules without Risk Director + Ro |
| `lib/regime/hmm.ts` — HMM classifier | Do not retrain or modify without Research Director audit (T16) |
| CI/CD gates | Do not modify GitHub Actions workflows without Ro approval |
| Supabase migrations | Do not add migrations outside `supabase/migrations/` (T01 fix) |
| `.env` secrets | Do not commit real API keys. Use `.env.example` as template. |

---

## Agent Permissions by Division

### Build Co (Division 1)
- ✅ Write code to feature branches
- ✅ Open PRs — cannot merge without REVIEW agent approval
- ✅ Write docs to `docs/`
- ✅ Write tests
- ❌ Cannot merge to main without PR approval
- ❌ Cannot modify protected areas (above) without Ro sign-off
- ❌ Cannot deploy to production without DEPLOY agent + Ro gate

### Capital Division Directors
- ✅ Read all code and docs
- ✅ Write to their division's task artifacts
- ✅ Route signals through TruthSerum gate
- ❌ Cannot modify engine files
- ❌ Cannot flip ALPACA_PAPER=false without T26 go/no-go + Ro approval
- ❌ Execution Division bypasses ROBBY — but still cannot bypass TruthSerum

### TRUTH Agent (Capital CRO)
- ✅ Read all Capital outputs before execution
- ✅ Issue PASS/FAIL verdicts with reason codes
- ✅ Log all verdicts to Supabase
- ❌ Cannot override a FAIL verdict — FAIL is final
- ❌ Cannot modify TruthSerum validation rules

---

## Data Source Rules

1. **Yahoo Finance is blocked.** TruthSerum returns `UNTRUSTED_DATA_SOURCE` for any signal sourced from Yahoo Finance.
2. **Polygon.io is the primary market data source** — after T13 key rotation.
3. **CCXT is the primary crypto data source.**
4. **FRED is the macro data source** — after T14 implementation.
5. No new data sources added without Data Director + Ro approval.

---

## Halal Mode Rules

1. `HALAL_MODE=true` activates halal screening gate on all signals
2. UNKNOWN verdict = FAIL. Always. Non-negotiable.
3. Ratio-based screening required — blocklist-only is insufficient
4. Compliance log (T31) requires human scholar review before Alif submission

---

## Position Sizing Rules

1. **Half-Kelly maximum** during paper run
2. **No position > $500** until T26 go/no-go passes
3. **No position > $500** during first 30 live trades post-T33
4. Kelly fraction calculated from TruthCal™ receipts (win rate + avg win/loss)

---

## TruthCal™ Receipt Rules

1. Receipts are **immutable** after generation
2. Receipt structure cannot be modified after T18 without Ro sign-off
3. Every trade (paper or live) must produce a receipt
4. Receipts are the Alif pitch artifact — treat them as legal documents

---

## Gate Rules (cannot be bypassed by any agent)

1. Pre-Phase (SC-01→SC-04) complete before any Capital agent is added
2. CW-05 (GitHub commit) verified before T01 work begins
3. TruthSerum wired to orchestrator before Sprint 1 gate closes
4. 30-trade minimum (T25) before T26 go/no-go
5. T28 (dashboard) + T29 (kill switch) done before T33
6. Ro signs GO_NOGO_DECISION.md before T27 (deploy)
7. Do not ask Ro to flip ALPACA_PAPER=false before all gates above pass
