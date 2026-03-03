# TradeSwarm

> AI-powered options trade decision engine. Multi-model deliberation, deterministic replay, and calibrated probability scoring — built on Next.js 16 + Supabase.

---

## What It Does

TradeSwarm runs a structured decision pipeline for US equity options trades. Give it a ticker and a dollar amount; it returns a **GO / WAIT / NO** decision backed by a cryptographically-hashed proof bundle you can replay and verify didn't change.

The core guarantee: every decision is **deterministic given the same market snapshot**. No `Math.random()` in the engine. No silent drift between preview and execute.

Currently operates in **paper mode only** — no live broker integration.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (Turbopack), React 19 |
| Styling | Tailwind CSS v4 |
| Auth & DB | Supabase (SSR, PostgreSQL) |
| AI | Vercel AI SDK v6 — Groq primary, OpenAI optional |
| External ML | TruthSerum — p_win + expected log return scorer |
| Market data | Yahoo Finance (direct, 5-min cache, circuit breaker) |
| Validation | Zod v4 |
| Language | TypeScript 5.8 |

---

## Engine Pipeline

8 deterministic stages. Fail-closed at every gate.

```
POST /api/trade/preview | simulate | execute
         │
         ▼
 1. Market data fetch ──── Yahoo Finance, 5-min in-memory cache, 3 s abort
         ▼
 2. Regime detection ───── Gaussian HMM, 4 states, 14-candle feature window
         │                 Features: returns, volatility, volume
         ▼
 3. Risk simulation ─────── Seeded Monte Carlo lite (mulberry32 LCG)
         │                 Outputs: maxLoss, sharpe, positionSize, riskLevel
         ▼
 4. Safety gates ────────── Spread %, OI, volume, earnings blackout (±2/1 day)
         │                 Bankroll cap 5%, max notional $25k, slippage 0.5%
         │                 → BLOCKED? Return NO immediately, nothing written
         ▼
 5. AI deliberation ─────── All providers in parallel → consensus check
         │                 Arbitration fires when consensusStrength < 1.0
         │                 Arbitrator: conservative bias, casting vote
         ▼
 6. Trust scoring ───────── 4-factor weighted score (0–100)
         │                  0.40  model agreement
         │                  0.30  provider credibility
         │                  0.20  regime alignment bonus
         │                  0.10  risk penalty
         ▼
 7. TruthSerum scoring ──── p_win + expected_log_return from external ML
         │                 Required for execute (fail-closed if unavailable)
         │                 Optional for preview / simulate
         ▼
 8. Persist ─────────────── trade_receipts + trade row → Supabase
                            preview:  receipt only  (action="preview")
                            simulate: receipt + trade (is_paper=true)
                            execute:  receipt + trade (is_paper per safety_mode)
```

---

## Determinism

The engine never calls `Math.random()`. All randomness is seeded.

- **`lib/engine/determinism.ts`** — `stableStringify` (key-sorted JSON) → SHA-256 = `determinism_hash`
- **`lib/engine/risk.ts`** — mulberry32 LCG seeded from ticker + timestamp string
- Every proof bundle stores `determinism_hash`, `market_snapshot_hash`, and `random_seed`
- **Governance lint** (`pnpm lint`) enforces both rules in CI

### Replay

```
GET /api/internal/ops/replay/:tradeId
```

Loads the original proof bundle, reruns the safety decision against the stored snapshot, and diffs field-by-field. Mismatches are classified:

| Classification | Meaning |
|---|---|
| `none` | Perfect match |
| `data_mismatch` | Market data changed between runs |
| `nondeterministic_logic` | Same inputs, different output — engine bug |
| `version_drift` | Logic changed since the trade was written |

---

## API Routes

### Trade

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/trade/preview` | Run engine, persist receipt only — no trade row |
| `POST` | `/api/trade/simulate` | Run engine, persist paper trade |
| `POST` | `/api/trade/execute` | Run engine, persist live trade (TruthSerum required) |
| `POST` | `/api/analyze` | AI analysis of a ticker — structured GO/WAIT/NO + bullets |
| `POST` | `/api/learn-why` | AI explanation of a decision in plain language |

### Scan

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/scan` | Full scan across liquid universe (5-min server cache) |
| `GET` | `/api/scan/:scanId` | Retrieve a previous scan result |

### Journal

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/journal/entry` | Create a trade journal entry with proof snapshot |
| `POST` | `/api/journal/close` | Close an open journal entry |
| `GET` | `/api/journal/performance` | Aggregate performance stats |

### Supporting

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/watchlist` | User watchlist |
| `GET` | `/api/health` | Basic health check |
| `GET` | `/api/health/engine` | Yahoo Finance probe + circuit breaker status |

### Internal (token-gated via `INTERNAL_JOBS_TOKEN`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/internal/jobs/outcome-tracker` | Log realized outcome (feeds calibration) |
| `POST` | `/api/internal/jobs/recalibrate` | Recompute Brier scores and drift thresholds |
| `GET` | `/api/internal/ops/calibration-metrics` | Calibration metrics + governance log (last 10) |
| `GET` | `/api/internal/ops/replay/:id` | Deterministic replay of any trade by ID |
| `GET` | `/api/internal/ops/validation-report` | Institutional validation snapshot |

---

## Scanner

The scanner never does "highest volume today" lookups. It ranks from a **fixed 120-ticker liquid universe** (`lib/universe.ts`) selected for tight spreads, front-month OI > 10k, weekly expirations, and ADV > 5M shares.

**Sectors covered:** Index ETFs · Mega-cap Tech · Financials · Healthcare · Energy · Consumer · Industrials · REITs · Macro/Commodities

**Score formula:**
```
score = RoR × 0.35  +  momentum  +  regime_bonus  −  event_penalty
```

**Event penalties:** earnings −20% · FOMC −10% · CPI −8% · NFP −6% · negative news up to −10%

**Tier min-RoR filters:** A ≥ 10% · B ≥ 12% · C ≥ 15%

Sector diversity trimming caps any single underlying at 3 candidates.

---

## Calibration

The engine tracks its own prediction accuracy over time:

- **Brier score** per model combination (Groq, OpenAI, or combined)
- **Reliability buckets** — 10-point bins comparing predicted vs realized probability
- **Auto-threshold tightening** — `recalibrate` job updates safety thresholds when drift exceeds tolerance
- **Governance log** — every threshold change written to `model_governance_log` with version + summary

---

## UI

Two shells — only one renders at a time (enforced by Tailwind breakpoint classes).

**Desktop** (`hidden lg:block`) — 3-pane layout: sidebar nav · main content · detail panel

**Mobile** (`lg:hidden`) — tab bar navigation with 3 screens:

| Tab | Screen | Component |
|---|---|---|
| Radar | Market scan results | `screens/radar-screen.tsx` |
| Trades | Active trade cards | `screens/trades-screen.tsx` |
| Money | Portfolio stats | `screens/money-screen.tsx` |

**Key components:**

| File | Role |
|---|---|
| `components/app.tsx` | Root shell, breakpoint guards, tab state |
| `components/trade-card.tsx` | GO/WAIT/NO decision card |
| `components/receipt-drawer.tsx` | Full proof receipt with tabs |
| `components/ProofDrawer.tsx` | Canonical proof bundle viewer |
| `components/tab-bar.tsx` | Fixed mobile tab bar (pb-24 clearance) |
| `components/learn-why-modal.tsx` | Plain-language AI explanation |
| `components/sniper-overlay.tsx` | Focused single-ticker mode |
| `components/ScanControls.tsx` | Scan configuration panel |

**Paper mode badge:** when `safety_mode = "training_wheels"`, all trades write `is_paper = true`. Badge sits at `bottom-16` in the safe zone above the tab bar.

---

## Directory Structure

```
TradeSwarm/
├── app/
│   ├── api/              # 19 route handlers (see API Routes above)
│   ├── auth/             # Supabase SSR auth pages (login, sign-up, error)
│   ├── internal/         # Internal admin pages
│   ├── layout.tsx
│   └── page.tsx          # Entry point — renders <App />
├── components/
│   ├── screens/          # radar-screen, trades-screen, money-screen
│   └── *.tsx             # 12 shared components
├── lib/
│   ├── adapters/         # http.ts (circuit breaker), truthserum.ts
│   ├── calibration/      # analytics.ts, updateThresholds.ts
│   ├── config/           # engine.ts — safety thresholds + feature flags
│   ├── engine/           # deliberation · determinism · market-context
│   │                     # orchestrator · regime · replayTrade · risk
│   │                     # runCanonicalTrade · runTradeSwarm · safety · scoring
│   ├── journal/          # proofSnapshot.ts
│   ├── market-data/      # yahoo.ts, yahooAdapter.ts
│   ├── regime/           # features · hmm · index · regime-map · types
│   │   └── __tests__/    # regime.test.ts
│   ├── scanner/          # acceptance · rank · score · stress · types
│   ├── scoring/          # credibility.ts
│   ├── supabase/         # admin · client · middleware · server
│   ├── types/            # proof-bundle.ts · proof.ts
│   ├── env/              # server-runtime.ts
│   ├── mock-data.ts
│   ├── universe.ts       # Fixed 120-ticker liquid universe
│   └── utils.ts
└── scripts/
    └── governance-lint.mjs   # CI: no Math.random, determinism_hash wired
```

---

## Database (Supabase / PostgreSQL)

**Core tables:**

| Table | Purpose |
|---|---|
| `profiles` | User identity, display name, avatar |
| `user_preferences` | safety_mode, theme, notifications |
| `portfolio_stats` | Balance, PnL, daily trade counts |
| `watchlist` | Per-user ticker list |
| `trades` | Trade rows with outcome, PnL, regime + risk data |
| `market_snapshots` | Deduplicated market data by content hash |
| `trade_receipts` | Immutable proof bundles (JSONB) |
| `trade_replay_reports` | Match/mismatch records from replay |
| `engine_events` | Per-stage timing and error events |
| `scan_results` | Cached scan outputs with determinism hash |
| `calibration_metrics` | Win rate, avg trust score, regime distribution |
| `model_governance_log` | Threshold change audit trail |
| `outcome_tracking_configs` | Horizon days config (1/5/20 day labels) |
| `trade_outcome_labels` | Predicted vs realized for Brier scoring |

RLS policies on all user-facing tables.

---

## Environment Variables

### Required

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
```

### Optional

```env
# Second AI provider
OPENAI_API_KEY=
AI_GATEWAY_API_KEY=          # Routes provider calls through a gateway

# External ML scorer (required for execute mode)
TRUTH_SERUM_URL=
TRUTH_SERUM_TIMEOUT_MS=500   # default: 500 ms

# Secures internal job endpoints
INTERNAL_JOBS_TOKEN=

# Replay thresholds
REPLAY_COVERAGE_THRESHOLD=0
REPLAY_MISMATCH_THRESHOLD=1

# Feature flags
FEATURE_ROB_ENGINE=0         # 1 to enable experimental ROB engine

# Safety threshold overrides (all have coded defaults)
SAFETY_MAX_SPREAD_PCT=1.0
SAFETY_MIN_UNDERLYING_VOLUME_24H=100000
SAFETY_MIN_OPTION_VOLUME_24H=100
SAFETY_MIN_OPTION_OI=200
SAFETY_MAX_SIZE_CAP_PCT=5
SAFETY_MAX_NOTIONAL_USD=25000
SAFETY_EARNINGS_BLACKOUT_BEFORE_DAYS=2
SAFETY_EARNINGS_BLACKOUT_AFTER_DAYS=1
SAFETY_MAX_SLIPPAGE_PCT=0.5
```

---

## Scripts

```bash
pnpm dev          # Next.js dev server with Turbopack
pnpm build        # Production build
pnpm start        # Production server
pnpm lint         # Governance lint — Math.random banned, determinism_hash wired
pnpm typecheck    # tsc --noEmit
```

---

## Engine Invariants

These must not be broken. Governance lint or type errors will catch most of them.

1. **`Math.random()` is banned** in `lib/` and `app/` — governance lint fails the build
2. **`determinism_hash` must be wired** on every trade path — governance lint enforces this
3. **Desktop shell** must keep `hidden lg:block` — removing `hidden` renders both shells simultaneously, breaking mobile tab navigation
4. **Mobile shell** must keep `lg:hidden` — same reason, opposite direction; `pb-24` is the TabBar clearance, do not remove it
5. **`CanonicalProofBundle` shape** is the contract between engine, API, and DB — changes require a migration
6. **`runCanonicalTrade`** is the only entrypoint to the engine for trade routes — bypassing it breaks replay

---

## Known Gaps

- The `/api/scan` POST route imports from `@/src/lib/scanner/scan` — this path doesn't resolve from `app/`, so scan POST currently returns 500
- No test suite beyond `lib/regime/__tests__/regime.test.ts` and scanner acceptance checks in `lib/scanner/acceptance.ts`
- TruthSerum is fail-closed on `execute` — if `TRUTH_SERUM_URL` is unset, execute trades are blocked entirely
- Market data cache is per-process — multi-instance deploys will have inconsistent cache state
- No live broker integration (paper mode only)
