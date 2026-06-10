# TradeSwarm — Halal Methodology
**Version:** 1.0 | **Date:** 2026-06-10 | **Owner:** Halal Partition
**Compliance standard:** DJIM (Dow Jones Islamic Market Index criteria)
**Alif artifact:** Yes — human scholar review gate required before submission

---

## Halal Mode Flag
- Toggleable: `HALAL_MODE=true/false` in environment
- When enabled: all trade signals pass through halal screening gate
- Fail-closed: UNKNOWN verdict = FAIL. Never permit unknown.
- This flag is what makes TradeSwarm-Halal a separate product partition

---

## Screening Methodology: DJIM-Compliant

### Business Activity Screen (Qualitative)
Excluded sectors (hard block):
- Alcohol production or distribution
- Tobacco
- Pork-related products
- Conventional financial services (interest-based banking, insurance)
- Weapons / defense
- Gambling / gaming
- Adult entertainment

### Financial Ratio Screen (Quantitative — DJIM thresholds)
All ratios use 12-month trailing average market cap as denominator:

| Ratio | DJIM Threshold | TradeSwarm Gate |
|-------|---------------|------------------|
| Debt / Market Cap | < 33% | FAIL if ≥ 33% |
| Cash + Interest-bearing securities / Market Cap | < 33% | FAIL if ≥ 33% |
| Accounts receivable / Market Cap | < 33% | FAIL if ≥ 33% |

**Audit flag (T15):** Current halal route (`app/api/halal/`) must be verified as ratio-based, not blocklist-only. Blocklist-only = insufficient for DJIM compliance.

---

## Verdict Logic
- PASS: Clears both business activity and all 3 financial ratio screens
- FAIL: Fails any single screen
- UNKNOWN: Data unavailable → treated as FAIL (fail-closed)

---

## Data Sources for Screening
- Financial ratios: Polygon.io fundamental data (T04)
- Business activity: SIC code + manual override list
- Zoya API: ❌ NOT CREATED — supplementary source (T15 scope)

---

## Compliance Log (T31)
- All halal verdicts logged per trade: ticker, verdict, ratios, timestamp
- Log stored in Supabase alongside TruthCal™ receipts
- **Human scholar review gate required before Alif submission**
- Q6 (OPEN): Does Alif require human scholar review of compliance log, or is agent-generated sufficient? Verify before T31 design is finalized.

---

## 100-Ticker Audit (T24)
- Pre-live: run halal gate against 100 representative tickers
- DoD: zero false positives documented (zero HARAM tickers passed as HALAL)
- Required before Sprint 3 gate closes

---

## Alif Accelerator Positioning
- Market: $341B Islamic fintech
- No high-quality halal-first AI trading engine exists
- TradeSwarm-Halal is the Alif pitch artifact
- TruthCal™ receipts + compliance log = verifiable proof bundle for scholars and investors
- Target: Alif SF, up to $500k pre-seed, Q3 2026

---

## Build Rules
1. Halal mode fail-closed — UNKNOWN = FAIL. Always.
2. Ratio-based screening required — blocklist-only is insufficient
3. Human scholar review gate before any Alif submission
4. Compliance log immutable — do not modify after T31 without Ro sign-off
