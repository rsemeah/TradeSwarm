# TradeSwarm Project Charter
**Version:** 1.0 | **Date:** 2026-06-10 | **Owner:** Ro (RedLantern Studios / By Red LLC)
**Division:** RedLantern Capital — Division 2

---

## Mission
Build an AI-native, halal-first autonomous trading engine that proves its decisions with cryptographic receipts (TruthCal™), runs safely on paper before touching live capital, and targets the $341B Islamic fintech market as a differentiated entrant for Alif accelerator Q3 2026.

---

## Scope

### In scope
- Equity + crypto paper trading via Alpaca (paper) and Coinbase Advanced Trade
- HMM regime classification + GROQ multi-model deliberation + Kelly position sizing
- TruthSerum validation gate (mandatory before any execution)
- TruthCal™ SHA-256 receipt bundle persisted to Supabase
- Halal screening (DJIM-compliant) with fail-closed verdicts
- Observability dashboard (P&L, drawdown, regime, TruthSerum pass rate)
- Manual kill switch (T29) — dashboard-accessible, kills all open orders

### Out of scope
- Options trading (future roadmap)
- Leverage / margin trading
- High-frequency trading (< 1 minute intervals)
- Unsupervised live trading without Ro approval (T33 gate)

---

## Success Criteria (all required for T33)
1. Win rate ≥ 52% over 30-trade paper run
2. Sharpe ratio ≥ 1.0 (annualized)
3. Max drawdown ≤ 15% of bankroll
4. TruthSerum PASS rate ≥ 95%
5. Average win / average loss ≥ 1.3
6. Halal gate: 0 HARAM tickers passed
7. Deliberation consensus ≥ 60% average

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Yahoo Finance in engine | HIGH | TruthSerum blocks YAHOO_FINANCE. Grep confirms before Sprint 1 gate closes. |
| TruthSerum not wired to orchestrator | CATASTROPHIC | T02 must verify import + smoke test before Sprint 1 gate. |
| Polygon.io key exposed in chat | SECURITY | Ro rotates at polygon.io/dashboard. Do not use exposed key. |
| HMM not trained | HIGH | T16 audit verifies training status before Sprint 2. |
| Schema drift (scripts/ + supabase/migrations/) | HIGH | T01 consolidates to single migration source. |
| Going live without kill switch | CATASTROPHIC | T29 hard-gated before T33. |
| Halal false positive | CRITICAL | T24 100-ticker audit before T26 go/no-go. |
| Alif scholar review requirement | MEDIUM | Q6: verify if agent-generated compliance log is sufficient before T31. |

---

## Legal Positioning
- TradeSwarm operates as a research / paper trading tool until T33
- No financial advice is rendered — TruthCal™ receipts are audit trails, not recommendations
- Halal mode is DJIM-methodology-aligned; human scholar review gate required before Alif submission (T31)
- All live trading requires explicit Ro approval (T33 gate — do not flip ALPACA_PAPER=false without sign-off)

---

## Ownership Transfer
- Build Co (SwarmClaw agents) → operational oversight at T28 (dashboard live)
- Full handoff to Capital War Room at T33 (live trading begins)

---

*Bismillah. Build with precision.*
