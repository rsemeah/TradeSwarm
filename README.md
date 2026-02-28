# TradeSwarm

TradeSwarm is a regime-aware options decision platform built with Next.js 15 + Supabase. It combines multi-model AI analysis, market-regime detection, risk simulation, and safety gating to produce conservative GO / WAIT / NO trade recommendations with auditable proof bundles.

## What is implemented

### 1) AI analysis + decisioning
- Multi-model analysis with Groq as the default and OpenAI as an optional second model.
- Consensus/arbitration flow for final decision confidence when swarm mode is enabled.
- Credibility scoring that blends trust score, agreement/dissent, regime quality, and risk profile.
- Learn-Why endpoint for explainability when a trade is blocked or downgraded.

### 2) Engine + safety controls
- `runTradeSwarm` engine supports `analyze`, `preview`, `simulate`, and `execute` modes.
- Structured proof bundle (`v1`) with stage-by-stage artifacts (preflight, regime snapshot, risk snapshot, arbitration, receipt payload assembly, persistence).
- Preflight safety checks and training-wheels style controls.
- Market-data and adapter circuit-breaker utilities.

### 3) Market regime + risk
- Yahoo market data integration for quote/expiration probing and regime context.
- Regime modeling (trend, volatility, momentum) and context construction.
- Risk simulation and context generation for final decision prompts.

### 4) Product surface (API + UI)
- API routes for:
  - analysis (`/api/analyze`)
  - trade orchestration (`/api/trade`, `/api/trade/preview`, `/api/trade/simulate`, `/api/trade/execute`)
  - explainability (`/api/learn-why`)
  - watchlist (`/api/watchlist`)
  - health (`/api/health`, `/api/health/engine`)
  - internal calibration/ops (`/api/internal/jobs/outcome-tracker`, `/api/internal/jobs/recalibrate`, `/api/internal/ops/calibration-metrics`)
- Authenticated app shell with multi-pane desktop workspace and radar/trades/money experiences.

### 5) Data + governance
- Supabase-backed auth, profile/preferences, watchlist, trade records, receipts, and engine event logging.
- Calibration governance pipeline:
  - outcome labeling dataset generation
  - periodic model-weight recalibration using Brier score
  - governance log + calibration metrics API
- CI + CodeQL + Dependabot + branch-protection checklist included under `.github/`.

## Repository map

```text
app/
  api/
    analyze/route.ts
    trade/{route,preview,simulate,execute}/route.ts
    learn-why/route.ts
    watchlist/route.ts
    health/{route,engine/route}.ts
    internal/jobs/{outcome-tracker,recalibrate}/route.ts
    internal/ops/calibration-metrics/route.ts
  auth/*
  page.tsx

components/
  app.tsx
  screens/*
  trade-card.tsx
  receipt-drawer.tsx
  learn-why-modal.tsx
  sniper-overlay.tsx

lib/
  engine/*
  scoring/credibility.ts
  calibration/analytics.ts
  adapters/*
  market-data/*
  supabase/*
```

## Database migrations

SQL migrations live in `scripts/` and cover:
- profiles + auth trigger
- user preferences + portfolio stats
- watchlist
- trades + receipts
- learn-why cache
- engine event telemetry
- JSONB expansion and canonical/enterprise receipt extensions
- calibration governance tables

> Note: there are several `012_*` migrations in this repository. Apply migrations according to your deployment migration tooling/order strategy.

## Environment variables

Create a `.env.local` with:

```env
# Core Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI providers
GROQ_API_KEY=
AI_GATEWAY_API_KEY=    # optional (or OPENAI_API_KEY)
OPENAI_API_KEY=        # optional

# Internal jobs/ops auth
INTERNAL_JOBS_TOKEN=   # optional but recommended
```

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Quality & security baseline

- CI workflow: `.github/workflows/ci.yml`
- CodeQL workflow: `.github/workflows/codeql.yml`
- Dependabot: `.github/dependabot.yml`
- Branch protection checklist: `.github/branch-protection-checklist.md`

## License

This project is source-available with **all rights reserved**. See [`LICENSE`](./LICENSE).
