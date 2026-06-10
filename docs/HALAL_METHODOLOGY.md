# TradeSwarm — Halal Methodology
**Version:** 1.0
**Date:** 2026-06-10
**Owner:** Halal Partition — Alif compliance track
**Tasks:** T15 (route audit), T24 (100-ticker audit), T31 (compliance log)
**Compliance Standard:** DJIM (Dow Jones Islamic Market Index)

---

## Purpose

TradeSwarm-Halal is a DJIM-compliant partition, toggleable via `HALAL_MODE=true`.

**⚠️ Alif submission requires human scholar review of T31 compliance log. Agent-generated logs are supporting evidence only.**

---

## Screening Methodology

### Primary Screen: Business Activity

| Category | Verdict |
|----------|---------|
| Alcohol, Tobacco, Weapons, Pork | HARAM |
| Conventional Finance (banks, insurance) | HARAM |
| Prohibited Entertainment | HARAM (case-by-case) |
| Activity UNKNOWN | UNKNOWN → FAIL |

### Secondary Screen: Financial Ratios (DJIM)

| Ratio | Threshold | Calculation |
|-------|-----------|-------------|
| Debt ratio | < 33% | Total debt / trailing 24-month avg market cap |
| Cash + interest-bearing securities | < 33% | (Cash + securities) / trailing 24-month avg market cap |
| Accounts receivable | < 33% | Accounts receivable / trailing 24-month avg market cap |

Any ratio ≥ 33% → HARAM. Data unavailable → UNKNOWN → FAIL.

---

## Fail-Closed Rule

**UNKNOWN verdict = FAIL. Always. Non-negotiable.**

---

## Implementation (T15 Audit Required)

**Route:** `app/api/halal/`

Ratio-based screening must be confirmed implemented — blocklist-only is insufficient for DJIM compliance.

### Data Sources
- Primary: Polygon.io fundamentals (after T13 key rotation)
- Fallback: Manual entry, flagged for scholar review
- Zoya API: supplementary (account not yet created)

---

## 100-Ticker Audit (T24)

- Run screening against 100 diverse tickers
- Zero false positives required (no HARAM returned as HALAL)
- UNKNOWN rate < 5%
- Results → `docs/HALAL_100_TICKER_AUDIT.md`

---

## Compliance Log Schema (T31)

```json
{
  "ticker": "AAPL",
  "timestamp": "2026-06-10T08:00:00Z",
  "verdict": "HALAL",
  "methodology_version": "DJIM-1.0",
  "business_screen": "PASS",
  "debt_ratio": 0.12,
  "cash_ratio": 0.18,
  "receivables_ratio": 0.09,
  "data_source": "polygon",
  "receipt_id": "<truthcal-sha256>"
}
```

---

## Alif Submission Checklist

- [ ] T15: ratio-based screening confirmed
- [ ] T24: 100-ticker audit, zero false positives
- [ ] T31: compliance log in Supabase
- [ ] Human Islamic finance scholar reviewed log
- [ ] Scholar sign-off documented
- [ ] This file committed to repo
- [ ] `HALAL_100_TICKER_AUDIT.md` committed

---

*Halal-first is not a feature. It is the foundation. Bismillah.*
