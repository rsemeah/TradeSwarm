# TradeSwarm

A regime-aware AI trading assistant that evaluates options trade setups using multi-model consensus, market regime detection, and risk simulation before recommending position sizing.

## Build Status

| Component | Status |
|-----------|--------|
| Core Engine | Implemented |
| AI Consensus (Groq) | Implemented |
| AI Consensus (OpenAI) | Optional (requires API key) |
| Regime Detection | Implemented |
| Risk Simulation | Implemented |
| Safety Gates | Implemented |
| Paper Trading | Implemented |
| Live Trading | Not Started |

## Architecture

```
app/
├── api/
│   ├── analyze/            # AI swarm consensus analysis
│   ├── trade/
│   │   ├── preview/        # Quick preview with regime context
│   │   ├── execute/        # Execute trade (paper mode)
│   │   └── simulate/       # Monte Carlo simulation
│   ├── health/             # System + engine health
│   ├── learn-why/          # AI explainer for blocked trades
│   └── watchlist/          # Watchlist management
├── auth/                   # Login/signup pages
└── page.tsx                # Main app entry

components/
├── app.tsx                 # Main app shell with 3-pane workspace
├── screens/                # Radar, Trades, Money screens
├── trade-card.tsx          # GO/WAIT/NO trade cards
├── receipt-drawer.tsx      # Trade receipt with AI breakdown
├── sniper-overlay.tsx      # Execute confirmation overlay
└── learn-why-modal.tsx     # AI explanation modal

lib/
├── engine/
│   ├── index.ts            # Engine orchestrator (runTradeSwarm)
│   ├── regime.ts           # Market regime detection
│   └── risk.ts             # Monte Carlo risk simulation
├── adapters/
│   └── http.ts             # Circuit breaker + timeout utilities
├── supabase/               # Supabase client + middleware
└── types.ts                # TypeScript definitions

scripts/                    # SQL migrations (001-002)
docs/                       # Architecture decisions
```

## Features

### AI Consensus Engine
- Primary model: Groq (Llama 3.3 70B, free tier)
- Optional secondary: OpenAI (via AI Gateway)
- Consensus rules: Both agree for GO, any NO = final NO, disagreement = WAIT

### Market Regime Detection
- Yahoo Finance data with circuit breaker protection
- Trend analysis (bullish/bearish/neutral)
- Volatility classification (low/medium/high/extreme)
- Momentum detection

### Risk Simulation
- Monte Carlo lite (configurable iterations)
- Max loss estimation at 95th percentile
- Position sizing recommendations

### Safety Systems
- **Training Wheels**: Max 1 trade/day, 1.5% position cap
- **Circuit Breaker**: Auto-degrades after 3 consecutive failures
- **Preflight Checks**: Gates before execution

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System health check |
| `/api/health/engine` | GET | Engine status + circuit breakers |
| `/api/analyze` | POST | Full AI swarm analysis |
| `/api/trade/preview` | POST | Quick preview with regime |
| `/api/trade/execute` | POST | Execute trade (paper) |
| `/api/trade/simulate` | POST | Run Monte Carlo simulation |
| `/api/learn-why` | POST | Get AI explanation |
| `/api/watchlist` | POST | Add to watchlist |

## Database

Supabase (PostgreSQL) with migrations in `scripts/`:

- `001_base_schema.sql` - Profiles, preferences, portfolio, trades, watchlist
- `002_engine_tables.sql` - Receipts, engine events, learn-why cache

## Environment Variables

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# AI (Required)
GROQ_API_KEY=

# AI (Optional - enables multi-model consensus)
AI_GATEWAY_API_KEY=
```

## Development

```bash
pnpm install
pnpm dev
```

## CI/CD

- `.github/workflows/ci.yml` - Lint, typecheck, build on PR
- `.github/dependabot.yml` - Weekly dependency updates

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL + Auth)
- **AI**: Vercel AI SDK 6, Groq
- **Styling**: Tailwind CSS + shadcn/ui

## License

Source-available with all rights reserved. See [LICENSE](./LICENSE).
