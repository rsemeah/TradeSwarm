# ZOYA API — METHODOLOGY DISCLOSURE

**Status: SCHEMA VERIFIED 2026-06-13**
Verified against: https://developer.zoya.finance/docs

---

## Endpoints

| Environment | URL |
|-------------|-----|
| Live        | `https://api.zoya.finance/graphql` |
| Sandbox     | `https://sandbox-api.zoya.finance/graphql` |

**Auth:** `Authorization: <api-key>` — no "Bearer" prefix. Key value directly in header.

---

## API Tiers

| Tier     | Cost         | Fields Available |
|----------|--------------|------------------|
| Basic    | Free/sandbox | symbol, name, exchange, status, reportDate. US stocks only. |
| Advanced | Paid plan    | Full financial ratios + global coverage. Required for H1-H4 gate breakdown. |

---

## Verified GraphQL Schema

### Basic Compliance Query
```graphql
query GetReport($symbol: String!) {
  basicCompliance {
    report(symbol: $symbol) {
      symbol
      name
      exchange
      status       # ComplianceStatus
      reportDate
    }
  }
}
```

### Advanced Compliance Query (AAOIFI)
```graphql
query GetAdvancedReport($symbol: String!) {
  advancedCompliance {
    report(input: { symbol: $symbol, methodology: AAOIFI }) {
      symbol
      rawSymbol
      name
      figi
      exchange
      status              # ComplianceStatus — overall verdict
      reportDate
      businessScreen      # ComplianceStatus — H1 sector verdict
      financialScreen     # ComplianceStatus — H2+H3+H4 combined
      compliantRevenue    # Float 0-100 (e.g., 99.72 = 99.72% halal revenue)
      nonCompliantRevenue # Float 0-100 — H1 revenue gate value
      questionableRevenue # Float 0-100
      ... on AAOIFIReport {
        debtToMarketCapRatio        # Float — H2 gate value
        securitiesToMarketCapRatio  # Float — H3 gate value
      }
    }
  }
}
```

### ComplianceStatus enum values
`COMPLIANT` | `NON_COMPLIANT` | `QUESTIONABLE` | `UNKNOWN`

---

## H-Gate Mapping (VERIFIED)

| Gate | TradeSwarm Field | Zoya Source Field | Threshold | Notes |
|------|-----------------|-------------------|-----------|-------|
| H1 Sector | h1_business_screen | businessScreen | COMPLIANT | Zoya verdict — no raw sector string returned |
| H1 Revenue | h1_noncompliant_revenue | nonCompliantRevenue | < 5.0 (of 0-100 scale) | e.g., 0.27 = 0.27% haram revenue |
| H2 Debt | h2_debt_ratio | debtToMarketCapRatio | < 0.33 | AAOIFI: debt/market_cap (NOT debt/total_assets per DJIM) |
| H3 Securities | h3_securities_ratio | securitiesToMarketCapRatio | < 0.49 | securities+receivables/market_cap |
| H4 Interest | ❌ NOT AVAILABLE | financialScreen (proxy) | — | financialScreen = H2+H3+H4 combined. Raw interest income ratio not exposed by Zoya. |

---

## Methodology Differences

### AAOIFI vs DJIM (H2 Debt Ratio)

- **AAOIFI** (Zoya implementation): `debt / market_cap < 33%`
- **DJIM** (index definition): `debt / total_assets < 33%`

These produce different verdicts for the same company. TradeSwarm uses AAOIFI via Zoya.
This must be disclosed in product UX.

### H1 Revenue Threshold
- 5% of total revenue may be from questionable/haram activities
- Zoya `nonCompliantRevenue` is on a 0-100 scale (e.g., 0.27 means 0.27%, NOT 27%)
- TradeSwarm threshold: `nonCompliantRevenue < 5.0`

### H4 — Cannot Be Isolated
Zoya API does not expose raw interest income ratio as a separate field.
`financialScreen` is Zoya's internal combined verdict covering H2+H3+H4.
When `financialScreen === COMPLIANT`, all three financial screens passed per Zoya's logic.
H4 isolation requires a different data source (e.g., direct SEC filings).

---

## QUESTIONABLE Status Handling

QUESTIONABLE means borderline — Zoya has insufficient confidence to classify definitively.

TradeSwarm rule:
- `QUESTIONABLE` → NOT a hard block (unlike NON_COMPLIANT)
- Returns `questionable: true, purification_required: true` to UI
- UI must surface purification consent flow before allowing trade
- Cached for 30min only (very short — recheck frequently)

---

## Before Go-Live Checklist

- [ ] Purchase Zoya Advanced API plan (developer.zoya.finance → Pricing)
- [ ] Set `ZOYA_API_KEY` to live key (not sandbox key — sandbox returns mock data)
- [ ] Set `ZOYA_SANDBOX=false` (or remove env var — live is default)
- [ ] Run `npm run type-check` — confirm no TypeScript errors in zoya.ts + route.ts
- [ ] Test with real AAPL call against sandbox → confirm response shape matches types
- [ ] Verify `halal_verdicts` upsert succeeds end-to-end
- [ ] Test QUESTIONABLE ticker path — confirm UI receives `purification_required: true`
- [ ] Confirm `plan_tier: "advanced"` in response (not "basic" fallback)

---

## Example Response (AMD — verified from Zoya docs)

```json
{
  "symbol": "AMD",
  "rawSymbol": "AMD",
  "name": "Advanced Micro Devices Inc.",
  "figi": null,
  "exchange": "XNAS",
  "status": "COMPLIANT",
  "reportDate": "2023-11-01T16:00:00.000Z",
  "businessScreen": "COMPLIANT",
  "financialScreen": "COMPLIANT",
  "compliantRevenue": 99.7253443758979,
  "nonCompliantRevenue": 0.2746556241020874,
  "questionableRevenue": 0,
  "debtToMarketCapRatio": 0.017235326034917495,
  "securitiesToMarketCapRatio": 0.03483800178616272
}
```
