# TradeSwarm

TradeSwarm is a regime-aware options engine built to maximize compounded bankroll growth. Powered by TruthCal™, it evaluates probability, liquidity, expected log return, and drawdown impact before allocating capital using capped fractional Kelly sizing.

## Governance Baseline

This repository includes CI and security workflows for pull requests into `main`, plus a branch-protection checklist to enforce review and status checks before merge.

## License

This project is source-available with **all rights reserved**. See [`LICENSE`](./LICENSE).
A regime-aware AI trading assistant built with Next.js 15, Supabase, and multi-model AI consensus. TradeSwarm evaluates options trade setups using probability, liquidity, expected return, and drawdown impact before recommending position sizing.

## Architecture

```
app/
├── api/
│   ├── analyze/          # AI swarm consensus analysis (Groq + OpenAI)
│   ├── health/           # System health + engine status
│   ├── learn-why/        # AI explainer for blocked trades
│   ├── trade/
│   │   ├── preview/      # Quick trade preview with regime context
│   │   ├── execute/      # Execute trade (paper/live)
│   │   └── simulate/     # Monte Carlo simulation
│   └── watchlist/        # Watchlist management
├── auth/                 # Login/signup pages
└── page.tsx              # Main app entry

components/
├── screens/              # Radar, Trades, MyMoney tab screens
├── trade-card.tsx        # GO/WAIT/NO trade cards with actions
├── theme-card.tsx        # Sector theme cards
├── sniper-overlay.tsx    # Execute confirmation overlay
├── receipt-drawer.tsx    # Trade receipt with AI breakdown
├── learn-why-modal.tsx   # AI explainer modal
└── logo.tsx              # Brand identity components

lib/
├── engine/
│   ├── index.ts          # Engine orchestrator
│   ├── regime.ts         # Market regime detection (Yahoo Finance)
│   └── risk.ts           # Monte Carlo risk simulation
├── adapters/
│   └── http.ts           # Circuit breaker + timeout utilities
├── supabase/             # Supabase client + middleware
├── auth-context.tsx      # Auth state management
├── trade-context.tsx     # Trade actions + state
└── types.ts              # TypeScript definitions
```

## Features

### AI Consensus Engine
- **Multi-model analysis**: Groq (free, fast) + OpenAI (accurate) running in parallel
- **Consensus synthesis**: Combines model outputs into final GO/WAIT/NO verdict
- **Trust scoring**: 0-100 confidence score with breakdown factors

### Regime Detection
- Real-time market data from Yahoo Finance
- Trend analysis (bullish/bearish/neutral)
- Volatility classification (low/medium/high/extreme)
- Momentum detection with circuit breaker protection

### Risk Simulation
- Monte Carlo lite with configurable iterations
- Max loss estimation at 95th percentile
- Position sizing recommendations
- Drawdown impact analysis

### Safety Systems
- **Training Wheels**: Max 1 trade/day, 1.5% position cap
- **Circuit Breaker**: Auto-degrades on API failures
- **Preflight Checks**: Gates before execution

### UI Components
- **Sniper Overlay**: Military HUD confirmation with countdown
- **Receipt Drawer**: Full trade breakdown with AI consensus tabs
- **Learn Why Modal**: AI explanation for blocked trades

## Database Schema

Run migrations in order (scripts/007-011):
- `trades` - Trade records with status, outcome, JSONB for AI/regime/risk
- `trade_receipts` - Immutable execution receipts
- `learn_why_cache` - Cached AI explanations
- `engine_events` - Event log for debugging

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System health check |
| `/api/health/engine` | GET | Engine status + circuit breakers |
| `/api/analyze` | POST | Full AI swarm analysis |
| `/api/trade/preview` | POST | Quick preview with regime |
| `/api/trade/execute` | POST | Execute trade |
| `/api/trade/simulate` | POST | Run simulation |
| `/api/learn-why` | POST | Get AI explanation |
| `/api/watchlist` | POST | Add to watchlist |

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# AI Providers
GROQ_API_KEY=           # Required (free tier)
AI_GATEWAY_API_KEY=     # Optional (OpenAI/Anthropic via Vercel AI Gateway)
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL + Auth)
- **AI**: Vercel AI SDK 6, Groq, OpenAI
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Context + SWR

## Development

```bash
pnpm install
pnpm dev
```

## License

Private - All rights reserved
