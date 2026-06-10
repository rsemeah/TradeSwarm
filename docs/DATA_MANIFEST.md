# TradeSwarm Data Manifest
**Version:** 1.0 | **Date:** 2026-06-10 | **Owner:** Data Division

---

## Data Sources

| Source | Type | Adapter | TruthSerum Tag | Status | Freshness SLA |
|--------|------|---------|----------------|--------|---------------|
| Polygon.io | Equity quotes, OHLCV, snapshots | `lib/market-data/polygon.ts` | `POLYGON_REALTIME` | ⚠️ KEY NEEDED — rotate exposed key first | < 5 min |
| Alpaca Markets | Equity execution + account data | `lib/brokers/alpaca.ts` | `ALPACA_FEED` | ✅ Paper account confirmed (PA3WMCEDJJS) | Real-time |
| Coinbase Advanced Trade | Crypto execution + account | `lib/brokers/coinbase.ts` | `COINBASE_FEED` | ⚠️ Keys unconfirmed (T12) | Real-time |
| CCXT (Coinbase / Binance) | Crypto OHLCV | `lib/market-data/ccxt-adapter.ts` | `CCXT_FEED` | ✅ Adapter written (T05) | < 1 min |
| FRED API | Macro features (Fed Funds, T10Y2Y) | MISSING — T14 | N/A | ❌ NOT CREATED | Daily |
| Zoya | Halal screening | MISSING | N/A | ❌ NOT CREATED | Weekly update |
| GROQ | LLM deliberation | `lib/engine/deliberation.ts` | N/A — internal | ✅ Key in .env.example | Per-request |
| Yahoo Finance | Equity quotes | `lib/market-data/yahoo.ts` | `YAHOO_FINANCE` | 🚫 BLOCKED by TruthSerum | N/A |

---

## Freshness Rules

TruthSerum enforces quote freshness. Default max age: **5 minutes (300,000ms)**.

| Data type | Max age | Hard fail? |
|-----------|---------|------------|
| Equity spot quote | 5 min | YES — TruthSerum FAIL |
| Crypto spot quote | 5 min | YES — TruthSerum FAIL |
| OHLCV bars (daily) | 24 hours | NO — warning only |
| Macro features (FRED) | 7 days | NO — warning only |
| Halal verdicts | 30 days | YES if halalMode=true |

---

## Data Lineage

```
Market Data Sources
├── Polygon.io (equity)
│   └── lib/market-data/polygon.ts → getQuote() / getBars()
│       └── → buildMarketContext() in lib/engine/market-context.ts
│           └── → TruthSerum gate (dataSource=POLYGON_REALTIME)
│               └── → orchestrator.ts deliberation
├── CCXT (crypto)
│   └── lib/market-data/ccxt-adapter.ts → getCryptoBars() / getCryptoQuote()
│       └── → TruthSerum gate (dataSource=CCXT_FEED)
└── Yahoo Finance (BLOCKED)
    └── lib/market-data/yahoo.ts — do not import from engine
        └── TruthSerum rejects YAHOO_FINANCE tag → FAIL

Execution
├── Alpaca → lib/brokers/alpaca.ts (equity paper/live)
└── Coinbase → lib/brokers/coinbase.ts (crypto)

Storage
└── Supabase (endovljmaudnxdzdapmf)
    ├── trade_receipts (TruthCal™ bundles — immutable after T18)
    ├── trades_v2 (trade records)
    └── engine_events (audit log)
```

---

## Accounts Needed

| Service | Cost | URL | Priority | Action |
|---------|------|-----|----------|--------|
| Polygon.io | $79/mo | polygon.io/dashboard | 🔥 NEXT | Sign up → rotate exposed key → add POLYGON_API_KEY to .env |
| FRED API | Free | fred.stlouisfed.org/docs/api | T14 | Sign up → add FRED_API_KEY to .env |
| Coinbase Advanced Trade | Free | coinbase.com/advanced-trade | T12 | Confirm keys → test isHealthy() |
| Zoya | TBD | zoya.finance | T15 | Research API availability |

---

## Security Notes
- **Polygon.io key was exposed in a previous chat session** — do NOT use it. Ro must rotate at polygon.io/dashboard before T13.
- All keys go in `.env` (gitignored). Never commit `.env`.
- `.env.example` documents required keys without values.
