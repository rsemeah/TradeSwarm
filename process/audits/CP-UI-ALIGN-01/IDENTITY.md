# CP-UI-ALIGN-01: Identity Lock

## PRODUCT_IDENTITY
**TradeSwarm** - AI-powered options trading decision engine with swarm intelligence

## DOMAIN
Options trading automation with:
- Multi-model deliberation (swarm consensus)
- TruthSerum verification (deterministic replay)
- Regime detection (market context awareness)
- Risk management (Monte Carlo, Kelly criterion)

## 3 Proofs

### 1. package.json
```json
{
  "name": "tradeswarm",
  "version": "0.1.0",
  "dependencies": {
    "ai": "^6.0.105",
    "@ai-sdk/react": "^3.0.107",
    "@supabase/supabase-js": "^2.49.1"
  }
}
```

### 2. Dominant Route Nouns
From `app/api/` structure:
- `/api/scan` - Scanner for trade candidates
- `/api/trade` - Trade execution (execute, preview, simulate)
- `/api/journal` - Trade journaling (entry, close, performance)
- `/api/watchlist` - User watchlists
- `/api/learn-why` - AI reasoning explanations
- `/api/internal/ops` - Calibration, replay, validation

### 3. Primary DB Tables (from scripts/*.sql)
- `profiles` - User profiles
- `trades` / `trades_v2` - Trade records
- `trade_receipts` - Proof bundles with determinism hashes
- `engine_events` - Stage-level audit trail
- `watchlist` - User watchlists
- `portfolio_stats` - Portfolio tracking
- `calibration_governance` - Threshold calibration

## DOMAIN COLLISION STATUS
**NONE** - This is purely TradeSwarm. No Hadith or other domain artifacts detected.

## Identity Locked
- Product: TradeSwarm
- Domain: Options Trading + AI Deliberation
- Core Loop: Scan → Deliberate → Score → Execute → Verify
