```
████████╗██████╗  █████╗ ██████╗ ███████╗███████╗██╗    ██╗ █████╗ ██████╗ ███╗   ███╗
╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔════╝██║    ██║██╔══██╗██╔══██╗████╗ ████║
   ██║   ██████╔╝███████║██║  ██║█████╗  ███████╗██║ █╗ ██║███████║██████╔╝██╔████╔██║
   ██║   ██╔══██╗██╔══██║██║  ██║██╔══╝  ╚════██║██║███╗██║██╔══██║██╔══██╗██║╚██╔╝██║
   ██║   ██║  ██║██║  ██║██████╔╝███████╗███████║╚███╔███╔╝██║  ██║██║  ██║██║ ╚═╝ ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝
```

<div align="center">

**Regime-Aware · Multi-Model AI Consensus · Deterministic Receipts · Safety-First**

[![CI](https://img.shields.io/github/actions/workflow/status/rsemeah/TradeSwarm/ci.yml?branch=master&label=CI&style=flat-square&color=00ff88)](/.github/workflows/ci.yml)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/rsemeah/TradeSwarm/codeql.yml?label=CodeQL&style=flat-square&color=00ff88)](/.github/workflows/codeql.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Groq](https://img.shields.io/badge/LLM-Groq%20%7C%20Llama%203.3%2070B-f55036?style=flat-square)](https://groq.com/)
[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red?style=flat-square)](./LICENSE)

*A paper-trading platform that puts a multi-agent AI deliberation council in front of every options trade — with a cryptographic audit trail to back it up.*

</div>

---

## What Is TradeSwarm?

TradeSwarm is a **regime-aware AI trading assistant** and paper-trading practice platform. Before recommending any options position, it:

1. **Scans** a curated 155-ticker universe for high-scoring credit and debit spread candidates
2. **Deliberates** across multiple LLMs in parallel to reach consensus
3. **Gates** every execution through hard safety rules (spread, volume, OI, slippage, earnings blackout)
4. **Stamps** a deterministic, SHA-256-linked receipt on every decision so replays match to the bit
5. **Blocks** live execution until empirical trade history satisfies institutional validation thresholds

> **Alpha Software.** Paper trading only. No live broker integration exists yet.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Core Engine](#core-engine)
  - [Trade Orchestration](#1-trade-orchestration)
  - [Multi-Model Deliberation](#2-multi-model-deliberation)
  - [Trust Scoring](#3-trust-scoring)
  - [Safety Gates](#4-safety-gates)
  - [Determinism & Replay](#5-determinism--replay)
  - [Regime Detection](#6-regime-detection)
- [Scanner](#scanner)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Frontend](#frontend)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [CI/CD & Governance](#cicd--governance)
- [Build Status](#build-status)

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│  CLIENT  ─  React 19 + Next.js 16 + Tailwind CSS 4                    │
│                                                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │ RadarScreen  │  │ TradesScreen │  │       MoneyScreen            │  │
│  │ (Themes/     │  │ (Candidates/ │  │ (Portfolio / Drawdown /      │  │
│  │  Watchlist)  │  │  Execution)  │  │  Weekly Win Rate)            │  │
│  └─────────────┘  └──────────────┘  └──────────────────────────────┘  │
└───────────────────────────────┬────────────────────────────────────────┘
                                │  HTTP (Next.js API Routes)
┌───────────────────────────────▼────────────────────────────────────────┐
│  API LAYER  ─  /app/api/                                               │
│                                                                        │
│  /scan          /trade         /learn-why    /health    /internal/*    │
│  (Full scan  +  (preview /     (AI explain   (DB+LLM    (calibration,  │
│   caching)       simulate /     endpoint)    probe)      replay, ops)  │
│                  execute)                                              │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────────┐
│  CORE ENGINE  ─  /lib/engine/                                          │
│                                                                        │
│  runCanonicalTrade()                                                   │
│    │                                                                   │
│    ├─► buildMarketContext()   ──── Yahoo Finance (quote + chain)       │
│    ├─► detectRegime()         ──── SMA/RSI/ATR on 60-day history       │
│    ├─► runDeliberation()      ──── Groq LLaMA 3.3 70B (+ OpenAI opt)  │
│    │     └─► arbitrate()      ──── Conservative arbiter on split vote  │
│    ├─► computeTrustScore()    ──── 4-factor weighted scoring (0-100)   │
│    ├─► evaluateSafety()       ──── Hard-block gates (fail-closed)      │
│    ├─► persistMarketSnapshot()──── SHA-256 content hash → Supabase     │
│    ├─► enforceReplayPolicy()  ──── Institutional validation gates      │
│    └─► writeReceipt()         ──── Immutable determinism_hash bundle   │
│                                                                        │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
┌────────────────┬──────────────▼────────────┬───────────────────────────┐
│  SCANNER       │   SUPABASE (PostgreSQL)    │   EXTERNAL SERVICES       │
│  /src/lib/     │                            │                           │
│  scanner/      │  profiles                  │  Yahoo Finance            │
│                │  trades + receipts         │  (quotes, options chain,  │
│  155 tickers   │  market_snapshots          │   60-day history)         │
│  PCS/CCS/CDS   │  engine_events             │                           │
│  candidates    │  calibration_metrics       │  Groq (Llama 3.3 70B)    │
│  Multi-factor  │  trade_replay_reports      │                           │
│  scoring       │  scan_results              │  TruthSerum (stub)        │
│  Stress tests  │  learn_why_cache           │  (fail-closed in exec)    │
└────────────────┴────────────────────────────┴───────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router + Turbopack) | 16.1.6 |
| UI | React | 19.0.0 |
| Language | TypeScript (strict) | 5.8.2 |
| Styling | Tailwind CSS | 4.2.1 |
| AI SDK | Vercel AI SDK | 6.0.105 |
| Primary LLM | Groq · Llama 3.3 70B | — |
| Secondary LLM | OpenAI (optional) | — |
| Database | Supabase (PostgreSQL 16) | 2.49.1 |
| Auth | Supabase Auth + SSR | 0.8.0 |
| Schema Validation | Zod | 4.3.6 |
| Market Data | Yahoo Finance (free) | — |
| Dev Environment | Docker Compose (Postgres + TruthSerum) | — |
| Package Manager | pnpm | — |

---

## Core Engine

### 1. Trade Orchestration

**`lib/engine/runCanonicalTrade.ts`** is the single entry point for all trade routes. No short-circuits exist — every call passes through the full pipeline:

```
runCanonicalTrade(ticker, strategy, mode)
  │
  ├─[1]─ buildMarketContext()       → fetch live quote + options chain
  ├─[2]─ detectRegime()             → classify market conditions
  ├─[3]─ runDeliberation()          → parallel LLM council vote
  ├─[4]─ computeTrustScore()        → 4-factor weighted score (0–100)
  ├─[5]─ evaluateSafety()           → hard block gates
  ├─[6]─ persistMarketSnapshot()    → store + SHA-256 hash
  ├─[7]─ enforceReplayPolicy()      → institutional validation gates
  └─[8]─ writeReceipt()             → determinism_hash proof bundle
```

---

### 2. Multi-Model Deliberation

**`lib/engine/deliberation.ts`** runs a two-round AI council:

```
Round 1 ──── Parallel invocations ────────────────────────────────────────
  ┌─────────────────────┐     ┌─────────────────────┐
  │   Groq / Llama 3.3  │     │  OpenAI (optional)  │
  │   (Primary judge)   │     │  (Secondary judge)  │
  └──────────┬──────────┘     └──────────┬──────────┘
             │   decision: GO/WAIT/NO     │
             └──────────────┬────────────┘
                            │
            consensusStrength < 1.0?
                            │
Round 2 ────── Arbitration ─▼─────────────────────────────────────────────
  ┌────────────────────────────────────────────┐
  │  Arbitrator LLM                            │
  │  Conservative bias: prefers WAIT over GO   │
  │  on genuine disagreement                   │
  └────────────────────────────────────────────┘
                            │
              Final output: { decision, confidence,
                winLikelihood, recommendedAmount }
```

---

### 3. Trust Scoring

**`lib/engine/scoring.ts`** — 4-factor weighted score (returns 0–100 integer):

| Factor | Weight | Logic |
|--------|--------|-------|
| **Model Agreement** | 40% | Agreement ratio × penalty (unanimous=1.0, 50/50 split=0.75) |
| **Provider Credibility** | 30% | Flat 0.8 baseline (will be calibrated empirically) |
| **Regime Alignment** | 20% | +0.2 if bullish/strong on GO · −0.2 if bearish |
| **Risk Penalty** | 10% | −0.3 extreme · −0.15 high · +0.05 low |

---

### 4. Safety Gates

**`lib/engine/safety.ts`** — hard-blocking rules. Any violation returns `blocked: true`:

```
✗  Bid-ask spread     > SAFETY_MAX_SPREAD_PCT         (default 1%)
✗  Underlying volume  < SAFETY_MIN_UNDERLYING_VOLUME  (default 100,000)
✗  Option volume      < SAFETY_MIN_OPTION_VOLUME      (default 100)
✗  Open interest      < SAFETY_MIN_OPTION_OI          (default 200)
✗  Estimated slippage > SAFETY_MAX_SLIPPAGE_PCT       (default 0.5%)
✗  Earnings blackout    active (2 days before · 1 day after)
✗  TruthSerum          unavailable in execute mode    (fail-closed)
```

Size clipping is always applied regardless of block status:
```
maxSizeHint = min(bankroll × SAFETY_MAX_SIZE_CAP_PCT, SAFETY_MAX_NOTIONAL_USD)
            = min(bankroll × 5%, $25,000)
```

---

### 5. Determinism & Replay

Every receipt carries a cryptographic proof of reproducibility:

```typescript
// lib/engine/determinism.ts
hashDeterministic(value) → SHA-256(stableStringify(value))
//                         ↑ canonical JSON with sorted keys

// Stored on every receipt:
{
  market_snapshot_ref:  "uuid → market_snapshots table",
  market_snapshot_hash: "sha256 of snapshot content",
  determinism_hash:     "sha256(inputs + snapshot + engine_config)",
  engine_version:       "ENGINE_VERSION env var"
}
```

**Institutional validation gates** block execution until these thresholds are met:

| Gate | Env Var | Default | Meaning |
|------|---------|---------|---------|
| Minimum trade history | `MIN_EMPIRICAL_TRADES` | 30 | Must have ≥30 logged trades |
| Receipt coverage | `REPLAY_COVERAGE_THRESHOLD` | 0% | % of trades with valid receipts |
| Mismatch tolerance | `REPLAY_MISMATCH_THRESHOLD` | 1 | Max allowed replay mismatch rate |
| Ruin probability | `MAX_RUIN_PROBABILITY` | 5% | Rolling drawdown ruin bound |
| Manual freeze | `system_controls.trade_engine_frozen` | — | Operator kill-switch in DB |

---

### 6. Regime Detection

**`lib/engine/regime.ts`** fetches 60 days of history from Yahoo Finance and classifies conditions:

```
Indicators computed:
  SMA20, SMA50          → trend direction
  RSI14                 → momentum
  ATR14                 → volatility
  Price change %        → short-term momentum
  Volume ratio          → conviction

Output classification:
  trend:      bullish | bearish | neutral
  volatility: low | medium | high
  momentum:   strong | weak | neutral
  confidence: 0–1 (degrades on sparse data)

Fallback: neutral regime on any data failure (fail-safe)
```

---

## Scanner

**`src/lib/scanner/`** — full pipeline for surfacing ranked trade candidates:

### Universe
- **155 fixed tickers** organized by sector (avoids regime whiplash from dynamic lookups)
- Custom watchlists supported via `/api/watchlist`

### Candidate Generation

| Strategy | Description | Entry Delta | Width |
|----------|-------------|-------------|-------|
| **PCS** (Put Credit Spread) | Short put + long put below | 0.25–0.35 | 1–2 strikes |
| **CCS** (Call Credit Spread) | Short call + long call above | 0.25–0.35 | 1–2 strikes |
| **CDS** (Call Debit Spread) | Long call + short call above | 0.45–0.55 | 1–2 strikes |

DTE windows: **10–21 days**, **21–30 days** (catalyst mode adds **3–7** and **10–21**)

### Scoring Model (composite, 0–100)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Final Score = weighted sum of:                                      │
│                                                                      │
│   35%  ROR Score      → Return on Risk · Kelly fraction             │
│   25%  POP Score      → Probability of Profit (IV positioning)      │
│   20%  IV/RV Score    → Implied vs Realized volatility spread       │
│   15%  Liquidity Score → Bid-ask spread · Volume · OI               │
│    +   Event Penalty  → Earnings / FOMC / CPI / NFP proximity       │
│    +   Regime Bonus   → Market conditions + sentiment alignment      │
└──────────────────────────────────────────────────────────────────────┘
```

### Stress Testing
Each candidate runs a **Monte Carlo scenario analysis**:
- ±1σ and ±2σ price moves
- P&L ranges under each scenario
- Output stored on candidate as `stressResults`

### Caching
Results are cached **5 minutes** in-process per watchlist config. Force-refresh via `{ forceRefresh: true }` in request body.

---

## API Reference

### Public Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scan` | Run scanner. Returns ranked candidate list with scores, stress results, and caching metadata. |
| `GET` | `/api/scan/[scanId]` | Fetch a previously stored scan result by ID. |
| `POST` | `/api/trade` | Trade orchestrator. Accepts `mode: preview | simulate | execute`. |
| `POST` | `/api/trade/simulate` | Run Monte Carlo simulation on a candidate. |
| `POST` | `/api/learn-why` | AI-generated plain-language explanation of a decision. Cached in DB. |
| `GET/POST` | `/api/watchlist` | Get or update a user's custom ticker universe. |
| `GET` | `/api/health` | Probes DB, Groq, and OpenAI. Tests SPY, QQQ, NVDA for market data health. |

### Internal / Ops Routes

> Protected by `INTERNAL_JOBS_TOKEN` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/internal/ops/calibration-metrics` | Brier scores, precision buckets, drift detection. |
| `GET` | `/api/internal/ops/validation-report` | Institutional validation snapshot + freeze recommendation. |
| `POST` | `/api/internal/ops/replay/[id]` | Replay a historical receipt and classify any mismatch. |
| `POST` | `/api/internal/jobs/outcome-tracker` | Mark trades as winner/loser for calibration. |
| `POST` | `/api/internal/jobs/recalibrate` | Recompute thresholds from historical outcomes. |

---

## Database Schema

Managed via SQL migrations in `scripts/` (001–008):

```
profiles                  ← Supabase auto-created, user identity
user_preferences          ← safety_mode, account settings
portfolio_stats           ← balance, drawdown_pct, trades_today, win_rate
watchlist                 ← user's custom ticker list

trades                    ← strategy, ticker, amount, outcome
trade_receipts            ← canonical proof bundles (determinism_hash, etc.)
market_snapshots          ← UUID-indexed snapshots + SHA-256 content hash
trade_replay_reports      ← replay analysis: match status, diff, classification

engine_events             ← full audit log of every engine decision
scan_results              ← scan run metadata + candidate counts
learn_why_cache           ← cached AI explanations (deduplicated)
calibration_metrics       ← Brier score, precision by confidence bucket
```

---

## Frontend

Three-screen layout with a persistent tab bar:

```
┌──────────────────────────────────────────────────────────────────┐
│                        TRADESWARM                                │
├──────────────┬────────────────────────────┬─────────────────────┤
│   RADAR      │         TRADES             │       MONEY          │
│              │                            │                      │
│  Market      │  ScanControls              │  Portfolio balance   │
│  Themes      │  DealList (candidates)     │  Drawdown buffer     │
│  (AI Infra,  │  DealCard (per candidate)  │  Daily P&L           │
│   Defense,   │  ProofDrawer (audit trail) │  Weekly win rate     │
│   Energy)    │  LearnWhyModal (AI explain)│  Trade history       │
└──────────────┴────────────────────────────┴─────────────────────┘
```

**Design system:** Dark terminal aesthetic
- Background: `#0a0a0a`
- Primary accent: `#00ff88` (neon green)
- Warning: `#ffcc00` · Danger: `#ff4444`
- Mobile-first (breakpoint: 420px)

**Demo mode:** Append `?demo=1` to any URL to use mock data (no API calls made).

---

## Environment Variables

```env
# ── Required ─────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GROQ_API_KEY=gsk_...

# ── LLM (optional second model) ──────────────────────────────────
AI_GATEWAY_API_KEY=           # OpenAI via gateway
OPENAI_API_KEY=               # Direct OpenAI fallback

# ── Internal route auth ──────────────────────────────────────────
INTERNAL_JOBS_TOKEN=          # Bearer token for /api/internal/*

# ── Safety thresholds ────────────────────────────────────────────
SAFETY_MAX_SPREAD_PCT=1.0
SAFETY_MIN_UNDERLYING_VOLUME_24H=100000
SAFETY_MIN_OPTION_VOLUME_24H=100
SAFETY_MIN_OPTION_OI=200
SAFETY_MAX_SIZE_CAP_PCT=5
SAFETY_MAX_NOTIONAL_USD=25000
SAFETY_EARNINGS_BLACKOUT_BEFORE_DAYS=2
SAFETY_EARNINGS_BLACKOUT_AFTER_DAYS=1
SAFETY_MAX_SLIPPAGE_PCT=0.5

# ── Institutional validation gates ───────────────────────────────
MIN_EMPIRICAL_TRADES=30
REPLAY_COVERAGE_THRESHOLD=0
REPLAY_MISMATCH_THRESHOLD=1
MAX_RUIN_PROBABILITY=0.05

# ── Engine metadata ──────────────────────────────────────────────
ENGINE_VERSION=unknown
TRUTH_SERUM_TIMEOUT_MS=500
```

---

## Local Development

### Prerequisites
- Node.js ≥ 20
- pnpm
- Docker (for local Postgres + TruthSerum stub)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/rsemeah/TradeSwarm
cd TradeSwarm
pnpm install

# 2. Start local services (Postgres on :5432, TruthSerum stub on :8787)
docker compose up -d

# 3. Copy env template and fill in values
cp .env.example .env.local

# 4. Apply database migrations
psql postgresql://tradeswarm:tradeswarm@localhost:5432/tradeswarm \
  -f scripts/001_base_schema.sql \
  -f scripts/002_trades_and_receipts.sql \
  ... (through 008)

# 5. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Append `?demo=1` to skip live API calls.

### Useful Commands

```bash
pnpm dev          # Next.js dev server (Turbopack)
pnpm build        # Production build
pnpm start        # Serve production build
pnpm lint         # ESLint governance checks
pnpm typecheck    # TypeScript strict type check
```

---

## CI/CD & Governance

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push / PR | Lint → typecheck → build (required gates) |
| `codeql.yml` | Push / Schedule | GitHub code security scanning |
| `codex-policy.yml` | PR | Codex automated PR policy review |
| `dependabot-auto-merge.yml` | Dependabot PR | Auto-merge labeled patch/minor deps |
| `block-unsafe.yml` | PR | Block dangerous operations |
| `self-heal.yml` | PR | Auto-fix governance issues |

### AGENTS.md Policy

**P0 (merge-blocking):**
- Safety wiring missing in any trade route
- Determinism hash not computed or not persisted
- Missing imports / unresolved modules / build breaks
- README claims non-existent files or workflows

**What Codex is authorized to do:**
- Fix build errors, stub missing modules, correct imports

**What Codex cannot do:**
- Change trading logic or safety evaluator behavior
- Remove or bypass the proof structure
- Disable CI gates

---

## Build Status

| Component | Status |
|-----------|--------|
| Canonical Trade Orchestrator | ✅ Implemented |
| Multi-Model Deliberation | ✅ Implemented |
| Trust Scoring (4-factor) | ✅ Implemented |
| Safety Evaluator (fail-closed) | ✅ Implemented |
| Determinism (SHA-256 hashing) | ✅ Implemented |
| Market Snapshot Persistence | ✅ Implemented |
| Deterministic Replay | ✅ Implemented |
| Regime Detection | ✅ Implemented |
| Full Scanner (PCS/CCS/CDS) | ✅ Implemented |
| RV20 Volatility Indicator | ✅ Implemented |
| Calibration Analytics | ✅ Implemented |
| Outcome Tracking | ✅ Implemented |
| Institutional Validation Gates | ✅ Implemented |
| Paper Trading | ✅ Implemented |
| News / Sentiment Module | 🔶 Stubbed (empty results) |
| Live Broker Integration | ❌ Not started |

---

## Repository Layout

```
TradeSwarm/
├── app/                          # Next.js App Router
│   ├── api/                      # All API route handlers
│   │   ├── scan/                 # Scanner endpoint
│   │   ├── trade/                # Trade orchestrator
│   │   ├── learn-why/            # AI explainer
│   │   ├── health/               # System health probe
│   │   ├── watchlist/            # Watchlist management
│   │   └── internal/             # Ops + cron endpoints
│   └── auth/                     # Login / signup pages
├── components/                   # React UI components
│   ├── app.tsx                   # Root app + tab bar
│   ├── radar-screen.tsx          # Market themes view
│   ├── trades-screen.tsx         # Candidate evaluation
│   ├── money-screen.tsx          # Portfolio stats
│   ├── DealCard.tsx              # Candidate card
│   ├── ProofDrawer.tsx           # Receipt inspector
│   └── learn-why-modal.tsx       # AI explanation modal
├── lib/                          # Core engine
│   ├── engine/                   # Orchestration, deliberation, safety
│   ├── scanner/                  # Scanner (lib version)
│   ├── calibration/              # Analytics + recalibration
│   ├── adapters/                 # HTTP circuit breaker
│   ├── receipts/                 # Receipt writing
│   ├── supabase/                 # DB client + middleware
│   └── types/                    # TypeScript contracts
├── src/lib/                      # v2 scanner (full implementation)
│   ├── scanner/                  # Candidate generation + scoring
│   ├── indicators/               # RV20, volatility
│   ├── news/                     # News + calendar (stubbed)
│   ├── adapters/                 # Yahoo Finance + safety
│   └── receipts/                 # Proof bundle writer
├── scripts/                      # SQL migrations (001–008)
├── docs/                         # Architecture documentation
├── __tests__ / tests/            # Unit + integration tests
├── supabase/                     # Supabase project config
├── docker-compose.yml            # Local dev: Postgres + TruthSerum
├── AGENTS.md                     # Repository policy contract
└── public/                       # Static assets
```

---

<div align="center">

*All rights reserved. See [LICENSE](./LICENSE).*

</div>
