# TradeSwarm

A regime-aware AI trading assistant that evaluates options trade setups using multi-model consensus, deterministic receipts, and safety gates before recommending position sizing.

## Build Status

| Component | Status |
|-----------|--------|
| Canonical Trade Orchestrator | Implemented |
| Determinism (SHA-256 hashing) | Implemented |
| Market Snapshot Persistence | Implemented |
| Safety Evaluator | Implemented |
| Scanner (src/lib/scanner) | Implemented |
| Regime Detection | Implemented |
| Calibration Analytics | Implemented |
| Outcome Tracking | Implemented |
| Paper Trading | Implemented |
| Live Broker Integration | Not Started |

## Architecture

```
app/api/
├── analyze/                    # AI swarm consensus
├── scan/                       # Scanner endpoint with caching
├── trade/
│   ├── preview/                # Preview with safety check
│   ├── execute/                # Execute (paper mode)
│   └── simulate/               # Monte Carlo simulation
├── internal/
│   ├── ops/calibration-metrics # Calibration dashboard
│   ├── ops/replay/[id]         # Deterministic replay
│   └── ops/validation-report   # Institutional validation report
├── health/                     # System + engine health
└── learn-why/                  # AI explainer

lib/
├── engine/
│   ├── runCanonicalTrade.ts    # Main orchestrator
│   ├── orchestrator.ts         # runTradeSwarm base
│   ├── safety.ts               # Safety evaluator
│   ├── determinism.ts          # SHA-256 hashing
│   ├── regime.ts               # Regime detection
│   └── risk.ts                 # Risk simulation
├── calibration/                # Analytics + threshold updates
├── scanner/                    # Scanner (lib version)
├── types/
│   └── proof-bundle.ts         # Canonical proof bundle v2
└── adapters/
    └── http.ts                 # Circuit breaker

src/lib/
├── scanner/                    # Full scanner implementation
├── news/                       # News + calendar modules
├── adapters/                   # Options chain, safety adapters
├── indicators/                 # RV20 indicator
└── receipts/                   # Receipt writer

scripts/                        # SQL migrations (001-003)
```

## Key Features

### Canonical Trade Flow
All trade routes call `runCanonicalTrade()` which:
1. Runs `runTradeSwarm()` for AI analysis
2. Builds canonical proof bundle with determinism context
3. Evaluates safety gates (spread, volume, OI, slippage)
4. Persists market snapshot with content hash
5. Enforces replay policy before execution
6. Writes immutable receipt with `determinism_hash`

### Deterministic Replay
Every receipt includes:
- `market_snapshot_ref` - UUID reference to stored snapshot
- `market_snapshot_hash` - SHA-256 of snapshot content
- `determinism_hash` - Hash of normalized inputs + snapshot + config
- `engine_version` - For version-aware replay


### Institutional Validation Gates
Execution is fail-closed when governance checks are not met. `/api/trade/execute` now evaluates:
- empirical trade count (`MIN_EMPIRICAL_TRADES`, default `30`)
- deterministic receipt coverage
- replay mismatch drift
- operator journal completeness
- rolling drawdown and ruin probability bounds

Operators can enforce or release freeze via the `system_controls` table (`trade_engine_frozen`). Validation snapshots are exposed at `/api/internal/ops/validation-report`.

### Safety Evaluator
Hard blocks for:
- Spread > threshold
- Volume < minimum
- Open interest < minimum
- Slippage > threshold
- Earnings blackout
- TruthSerum unavailable (fail-closed)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan` | POST | Run scanner, returns ranked candidates |
| `/api/trade/preview` | POST | Preview with safety decision |
| `/api/trade/execute` | POST | Execute (paper mode) |
| `/api/trade/simulate` | POST | Monte Carlo simulation |
| `/api/internal/ops/replay/[id]` | POST | Replay a receipt |
| `/api/internal/ops/calibration-metrics` | GET | Calibration dashboard |
| `/api/internal/ops/validation-report` | GET | Validation + freeze recommendation |
| `/api/internal/jobs/outcome-tracker` | POST | Track trade outcomes |

## Database Schema

Migrations in `scripts/`:

```
001_base_schema.sql      - profiles, user_preferences, portfolio_stats, watchlist
002_trades_and_receipts.sql - trades, market_snapshots, trade_receipts, replay_reports
003_engine_events.sql    - engine_events, scan_results, learn_why_cache, calibration_metrics
```

## Environment Variables

Vercel deployment/runtime requires these variables for API routes:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=                 # Model provider key used by default

# Optional
AI_GATEWAY_API_KEY=           # Enables OpenAI gateway path
OPENAI_API_KEY=               # Optional direct OpenAI key
INTERNAL_JOBS_TOKEN=          # Protects internal cron/ops routes
REPLAY_COVERAGE_THRESHOLD=0   # Block execute if coverage < threshold
REPLAY_MISMATCH_THRESHOLD=1   # Block execute if mismatch rate > threshold
MIN_EMPIRICAL_TRADES=30       # Freeze execute until this trade count exists
MAX_RUIN_PROBABILITY=0.05     # Damp sizing / freeze when exceeded
```

## Development

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

## CI/CD

- `.github/workflows/ci.yml` - Deterministic CI gate (lint, typecheck, build)
- `.github/workflows/codex-policy.yml` - Codex PR policy review via `openai/codex-action@v1`
- `.github/workflows/dependabot-auto-merge.yml` - Enables auto-merge for labeled Dependabot PRs
- `.github/dependabot.yml` - Weekly dependency updates with grouped patch/minor bumps
- `AGENTS.md` - Repository policy contract used by Codex and maintainers

## License

All rights reserved. See [LICENSE](./LICENSE).
