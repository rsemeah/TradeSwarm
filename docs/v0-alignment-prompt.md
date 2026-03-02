# TradeSwarm · v0.dev Full-Stack Alignment Prompt

> **Purpose**: Paste this document (or a section of it) into v0.dev as the
> alignment prompt.  It is a living spec — update it as each sprint closes.
> Last updated: 2026-03-02 (post-CP3).

---

## 0 · TL;DR for v0

Build missing UI for a **dark, data-dense, tactical trading dashboard** called
**TradeSwarm**.  Backend is complete; UI coverage is ~40%.  The missing pieces
are listed in §10.  Do not change any API route path, response shape, type
name, or design token.  Tailwind only.  App Router.  Desktop 3-pane + mobile
tabs, both first-class.

---

## 1 · Stack & Constraints

| Item | Value |
|------|-------|
| Framework | Next.js App Router (v16, TypeScript) |
| Styling | Tailwind CSS only — no CSS-in-JS |
| Auth | Supabase SSR (`@supabase/ssr`) |
| DB | Supabase (Postgres) |
| State | React Context (AuthProvider, TradeProvider) |
| AI | Vercel AI SDK (`ai` package) + multi-model swarm |
| Icons | No library — use inline SVG or emoji |
| Charts | Inline SVG or canvas — no chart library |
| New deps | Ask before adding any |

---

## 2 · Design System (exact tokens — do not deviate)

```css
--background:       #0a0a0a;   /* near-black canvas */
--foreground:       #ffffff;
--card:             #141414;
--border:           #1f1f1f;
--muted:            #141414;
--muted-foreground: #6b6b6b;
--accent:           #00ff88;   /* neon green — primary action, GO badge */
--warning:          #ffcc00;   /* WAIT, WARN state */
--danger:           #ff4444;   /* NO, ALERT, block */
--radius:           10px;
```

**Typography**
- Body: `font-family: system-ui`
- Ticker symbols, telemetry, scores: `font-family: monospace`
- Never sentence-case a ticker symbol

**Visual language** — "trader cockpit".  High information density.  No
decorative whitespace.  Compact padding.  Data labels above values, always.
Max mobile width target: 420 px.

**Badges**

| State | Color |
|-------|-------|
| GO | `bg-[#00ff88] text-black` |
| WAIT | `bg-[#ffcc00] text-black` |
| NO | `bg-[#ff4444] text-white` |
| OK (drift) | `bg-emerald-500 text-white` |
| WARN (drift) | `bg-amber-400 text-black` |
| ALERT (drift) | `bg-rose-500 text-white` |

---

## 3 · Information Architecture

### Desktop (≥ lg)

Three resizable panes side-by-side:

```
┌─────────────────┬──────────────────────────┬─────────────────┐
│  LEFT PANE      │  CENTER PANE             │  RIGHT PANE     │
│  ~20% width     │  ~50% width              │  ~30% width     │
│                 │                          │                 │
│  Section nav:   │  Feed view-mode switch:  │  Context        │
│  · Market Ctx   │    card / table /        │  summary        │
│  · Feed         │    context / timeline    │  blocks         │
│  · Symbols      │                          │                 │
│  · News         │  Main content list       │                 │
│  · Journal      │                          │                 │
│  · Receipts     │                          │                 │
│  · My Money     │                          │                 │
│  · Settings     │                          │                 │
└─────────────────┴──────────────────────────┴─────────────────┘
```

### Mobile (< lg)

Fixed-bottom tab bar — 3 tabs:

```
┌──────────────────┐
│  Screen content  │
│  (scrollable)    │
│                  │
└──────────────────┘
[Radar 📡] [Trades 🏄] [My Money 💰]
```

---

## 4 · Existing Components (do NOT re-generate — integrate instead)

| File | Purpose |
|------|---------|
| `components/app.tsx` | Root shell (desktop panes + mobile tab routing) |
| `components/tab-bar.tsx` | Fixed bottom nav |
| `components/trade-card.tsx` | Expandable candidate card (GO/WAIT/NO) |
| `components/receipt-drawer.tsx` | Bottom-sheet proof bundle viewer (5 tabs) |
| `components/sniper-overlay.tsx` | Full-screen execution confirm (3s countdown) |
| `components/learn-why-modal.tsx` | Blocked-trade explanation modal |
| `components/theme-card.tsx` | Market theme card with heat badge |
| `components/DealCard.tsx` | Scanner deal card (ticker, score, ROR, DTE) |
| `components/DealList.tsx` | Grid of DealCards |
| `components/ScanControls.tsx` | Scanner filter + refresh button |
| `components/screens/radar-screen.tsx` | Radar tab: themes + scanning |
| `components/screens/trades-screen.tsx` | Trades tab: candidates + execution |
| `components/screens/money-screen.tsx` | My Money: balance, safety, milestones |
| `app/internal/ops/page.tsx` | CP3 calibration dashboard (ECE, drift, policy) |

---

## 5 · Domain Types (preserve all names exactly)

```typescript
// ── Core Status ──────────────────────────────────────────────
type TradeStatus = "GO" | "WAIT" | "NO"
type DriftState  = "OK" | "WARN" | "ALERT"
type TabId       = "radar" | "trades" | "money"
type RegimeLabel = "BULL" | "BEAR" | "SIDEWAYS" | "VOLATILE"
type SafetyMode  = "training_wheels" | "normal" | "pro"
type Outcome     = "open" | "win" | "loss" | "breakeven"

// ── Market Theme ─────────────────────────────────────────────
interface Theme {
  name: string
  heat: "hot" | "warming" | "quiet"
  tickers: string[]
  brief: string
}

// ── Trade Candidate ───────────────────────────────────────────
interface TradeCandidate {
  ticker: string
  strategy: string
  status: TradeStatus
  trustScore: number             // 0–100
  winLikelihoodPct: number | null
  amountDollars: number | null
  bullets: { why: string; risk: string; amount: string }
  auditSimple: {
    trustScore: number
    winLikelihood: number | null
    marketStability: string
    fillQuality: string
    recommended: string
    decision: string
  }
  auditAdvanced: {
    growthScore: number
    netElr: number
    popLowerBound: number
    kellyFinal: number
    regimeScore: number
    liquidityScore: number
    gates: string[]
  }
  scoring?: TradeScoringDetail
}

interface TradeScoringDetail {
  finalScore: number
  factors: Array<{ name: string; score: number; weight: number }>
  penalties: Array<{ name: string; reduction: number; reason: string }>
  boosts: Array<{ name: string; increase: number; reason: string }>
  formula: { base: number; after_penalties: number; after_boosts: number }
}

// ── Portfolio ────────────────────────────────────────────────
interface Portfolio {
  balance: number
  dayPnl: number
  drawdownPct: number
  drawdownLimitPct: number
  tradesToday: number
  tradesTodayMax: number
  paperTradesCompleted: number
  paperTradesRequired: number       // 200
  safetyMode: SafetyMode
  weekStats: {
    trades: number
    wins: number
    winRatePct: number
    avgGainDollars: number
  }
  dailySummary: string
}

// ── Journal ──────────────────────────────────────────────────
interface JournalEntry {
  id: string
  ticker: string
  strategy_type: string
  entry_date: string
  outcome: Outcome
  outcome_label: "win" | "loss" | "scratch" | "open"
  realized_pnl: number | null
  r_multiple: number | null          // realized_pnl / max_risk
  max_risk: number | null
  credit_received: number | null
  confidence_at_entry: number | null // 0–1
  engine_score_at_entry: number | null
  regime_at_entry: RegimeLabel | null
  notes: string | null
  created_at: string
}

// ── CP3 Calibration ──────────────────────────────────────────
interface CalibrationBin {
  range: string
  predicted: number
  actual: number
  count: number
  contribution: number
}

interface SelectivityPoint { topPct: number; winRate: number; count: number }

interface Cp3Report {
  generatedAt: string
  windowDays: number
  sampleSize: number
  ece: number
  brierScore: number
  drift: DriftState
  bins: CalibrationBin[]
  selectivity: SelectivityPoint[]
  evAlignment: {
    expectedEV: number
    realizedEV: number
    alignmentRatio: number
    sampleSize: number
  }
  recommendedThresholds: {
    minConfidenceToExecute: number
    action: "RAISE" | "LOWER" | "HOLD"
    reason: string
  }
  policy: {
    minConfidenceToExecute: number
    maxRiskPct: number
    haltOnDriftAlert: boolean
  }
}

// ── Proof Bundle (canonical) ──────────────────────────────────
interface CanonicalProofBundle {
  request_id: string
  ticker: string
  mode: "preview" | "simulate" | "execute" | "analyze"
  safety_decision: {
    allowed: boolean
    reason_code: string
    reasons: string[]
    safety_notes: string[]
  }
  regime_snapshot: {
    trend: string; volatility: string; momentum: string
    rsi: number; atr: number; sma20: number; sma50: number
    label: RegimeLabel; confidence: number
  }
  risk_snapshot: {
    riskLevel: string; maxPositionSize: number
    kellyFraction: number; sharpeRatio: number
    p5_loss: number; p50_loss: number; p95_loss: number
  }
  score: number
  trust_score: number
  determinism_hash: string
  events: Array<{ stage: string; status: string; duration_ms: number }>
}
```

---

## 6 · API Contracts (call these — do not invent new routes)

### POST `/api/analyze`
```typescript
// Request
{ ticker: string; theme: string; marketContext?: string; useSwarm?: boolean }

// Response (use these keys)
{
  success: boolean
  correlationId: string
  analysis: {
    ticker: string; status: TradeStatus; trustScore: number
    winLikelihoodPct: number | null; recommendedAmount: number | null
    bullets: { why: string; risk: string; amount: string }
    reasoning: string
  }
  credibility: {
    trustScore: number; rawAvgScore: number; agreementRatio: number
    penaltyFactor: number; factors: string[]; weights: Record<string, number>
  }
  engine: { regime: object; risk: object }
  modelResults: Array<{ model: string; status: TradeStatus; trustScore: number; reasoning: string }>
  proofBundle: CanonicalProofBundle
}
```

### POST `/api/trade`
```typescript
// Request
{
  action: "preview" | "simulate" | "execute"
  trade: {
    ticker: string; strategy?: string; status?: TradeStatus
    trustScore?: number; amountDollars?: number
    bullets?: { why: string; risk: string; amount: string }
  }
  theme?: string; marketContext?: string
}

// Response
{
  success: boolean; blocked: boolean
  tradeId: string | null; receiptId: string | null
  proofBundle: CanonicalProofBundle
  reasonCode: string | null
}
```

### POST `/api/learn-why`
```typescript
// Request
{ ticker: string; status: TradeStatus; strategy: string; bullets: object; trustScore: number }

// Response
{
  explanation: {
    headline: string; eli5: string; technicalExplanation: string
    keyFactors: Array<{ factor: string; impact: "positive"|"negative"|"neutral"; explanation: string }>
    whatWouldChange: string
    alternatives?: Array<{ ticker: string; reason: string }>
  }
}
```

### POST `/api/watchlist`
```typescript
{ ticker: string; theme: string }   // → 200 ok / 401
```

### POST `/api/journal/entry`
```typescript
{
  ticker: string; strategy_type: string; entry_date: string
  expiration_date: string; strikes: object; credit_received?: number
  max_risk?: number; engine_score_at_entry?: number; regime_at_entry?: string
  notes?: string
}
// Response: { entry: JournalEntry }
```

### POST `/api/journal/close`
```typescript
{ trade_id: string; exit_price: number }
// Response: { trade: { id, outcome, realized_pnl } }
// Side-effect: immediately writes a calibration dataset row (CP3)
```

### GET `/api/journal/performance`
```typescript
// Response:
{
  totalTrades: number; wins: number; losses: number; winRate: number
  totalPnl: number; avgR: number
  byRegime: Record<RegimeLabel, { trades: number; winRate: number; avgPnl: number }>
  byStrategy: Record<string, { trades: number; winRate: number; avgPnl: number }>
}
```

### GET `/api/internal/ops/calibration?window=200`
```typescript
// Response: Cp3Report (see §5)
// Available to all authenticated users — use for transparency screen
```

### GET `/api/health/engine`
```typescript
{
  status: "ok" | "degraded" | "frozen"
  engineDegraded: boolean; warnings: string[]
  frozenBy?: string; frozenAt?: string
}
```

### GET `/api/scan`
```typescript
{
  scan_id: string; scanned_at: string; cached: boolean
  universe: string[]
  candidates: CandidateProofBundle[]
  empty: boolean; empty_reason?: string
  filter_counts: Record<string, number>
  tier_counts: { A: number; B: number; C: number }
}
```

---

## 7 · Existing Context Providers

```typescript
// lib/auth-context.tsx
const { user, loading, signOut } = useAuth()

// lib/trade-context.tsx
const {
  isLoading, lastResult, analysisInProgress, currentAction,
  executeTrade,   // (candidate: TradeCandidate) => Promise<void>
  simulateTrade,  // (candidate: TradeCandidate) => Promise<void>
  watchTicker,    // (ticker: string, theme: string) => Promise<void>
  analyzeTheme,   // (theme: Theme) => Promise<TradeCandidate>
  learnWhy,       // (candidate: TradeCandidate) => Promise<void>
  clearResult,    // () => void
} = useTrade()
```

---

## 8 · What ALREADY works end-to-end (do not touch)

- Auth flow (login, sign-up, error, success pages)
- Radar tab: theme cards, scanning spinner, analysis progress toast
- Trades tab: TradeCard expand/collapse, execute/simulate/learn-why
- Sniper overlay (execution confirm with countdown)
- Receipt drawer (5-tab proof bundle viewer)
- My Money: balance, drawdown meter, road-to-real-money progress, weekly stats
- Internal ops CP3 dashboard: ECE, drift badge, selectivity, EV alignment, policy gate
- Paper mode enforcement + training-wheels daily limit

---

## 9 · Behavioral States Required in Every New Component

All data-fetching components must handle:

| State | Render |
|-------|--------|
| `loading` | Skeleton or pulsing placeholder — never empty |
| `empty` | "No data yet" message with context (e.g., "Close some trades to populate") |
| `error` | Red border card with `reasonCode` if present |
| `stale` | Gray tint + "Refreshing…" indicator |

---

## 10 · What to Build (prioritized — highest impact first)

### TIER 1 — Core user loop closers

#### 10.1 Trade Journal Screen
**Route**: add as new section in desktop left-pane + new mobile tab (or sub-tab of Trades)
**Component**: `components/screens/journal-screen.tsx`

```
┌─────────────────────────────────────────────────────────┐
│  JOURNAL   [This Week ▼]   [+] New Entry          [CSV] │
├─────────────────────────────────────────────────────────┤
│  Performance bar: 7 trades · 5W 2L · 71% · +$284 PnL   │
│  R avg: +0.4R                                           │
├─────────────────────────────────────────────────────────┤
│  [open]  NVDA  iron_condor   BULL  score:72  --         │
│  [win]   AAPL  bullish_sprd  BULL  score:68  +$148 +1.2R│
│  [loss]  TSLA  iron_condor   VOLT  score:51  -$93  -0.7R│
└─────────────────────────────────────────────────────────┘
```

- Calls `GET /api/journal/performance` for the summary bar
- Lists `JournalEntry` rows from `trades_v2` (query via `/api/journal/performance` or Supabase client)
- Each row is expandable: shows `bullets`, `regime_at_entry`, `r_multiple`, `confidence_at_entry`
- Open trades have a **Close** button → opens a price input → calls `POST /api/journal/close`
- Outcome badge: `win` = green, `loss` = red, `scratch` = gray, `open` = pulsing yellow
- Sort by: entry date, R-multiple, score, regime

#### 10.2 Performance Analytics Panel
**Component**: `components/by-regime-table.tsx` + `components/by-strategy-table.tsx`

Use `GET /api/journal/performance` response:
- `byRegime`: table with BULL/BEAR/SIDEWAYS/VOLATILE rows, win rate, avg PnL
- `byStrategy`: same for iron_condor / bullish_spread / bearish_spread
- Highlight best-performing regime/strategy in green accent
- Minimum 10 trades before showing win rate (else "not enough data")

#### 10.3 Watchlist Screen
**Component**: `components/screens/watchlist-screen.tsx`

```
┌──────────────────────────────────┐
│  WATCHLIST                 [+]   │
├──────────────────────────────────┤
│  NVDA  · AI Infrastructure       │
│  RTX   · Defense + Geopolitics   │
│  [Analyze] [Remove]              │
└──────────────────────────────────┘
```

- Stored in Supabase `watchlist` table (already exists); query via `@/lib/supabase/client`
- "Analyze" button calls `analyzeTheme()` from TradeContext and navigates to Trades tab
- Empty state: "No tickers watched yet — tap 'Watch Only' on any theme"

---

### TIER 2 — Transparency & trust builders

#### 10.4 Regime Inspector Widget
**Component**: `components/regime-inspector.tsx`
**Placement**: right pane on desktop, expandable section in Radar tab on mobile

```
┌────────────────────────────────────────┐
│  REGIME  BULL  88% conf                │
│  Trend:  Bullish   Volatility: Low     │
│  Momentum: Strong                      │
│  RSI: 67  ATR: 2.4  SMA20>SMA50: ✓    │
│  Updated: 14s ago                      │
└────────────────────────────────────────┘
```

- Reads from `engine.regime` in the last `/api/analyze` response (stored in TradeContext)
- If no recent analysis: shows "Run a scan to see regime"
- Color-code regime: BULL=green, BEAR=red, SIDEWAYS=gray, VOLATILE=amber

#### 10.5 Scoring Breakdown Drawer
**Component**: `components/scoring-drawer.tsx`
**Trigger**: "Why this score?" link inside `TradeCard` (already has auditAdvanced section)

```
┌───────────────────────────────────────┐
│  SCORE RECIPE for NVDA                │
│  Base: 50.0                           │
│  ─────────────────────────────────    │
│  Factors                              │
│  · Regime Alignment  +12  (w: 0.25)   │
│  · Liquidity Score   +8   (w: 0.20)   │
│  ─────────────────────────────────    │
│  After factors: 70.0                  │
│  Penalties: −3  (earnings blackout)   │
│  Boosts:    +4  (sector momentum)     │
│  ─────────────────────────────────    │
│  Final: 71                            │
└───────────────────────────────────────┘
```

- Uses `candidate.scoring` (TradeScoringDetail) if present
- Falls back to showing `auditAdvanced` fields if `scoring` is absent

#### 10.6 Model Agreement Panel
**Component**: `components/model-consensus.tsx`
**Placement**: Expandable section inside TradeCard (below bullets)

```
┌──────────────────────────────────────────┐
│  MODEL CONSENSUS   Strength: 91%         │
│  groq    GO  82          ●●●●●●●●○○      │
│  openai  GO  79          ●●●●●●●●○○      │
│  Final:  GO  consensus: "Strong bull..."  │
└──────────────────────────────────────────┘
```

- Uses `modelResults[]` and `aiConsensus` from `/api/analyze` response
- Bars are inline SVG progress bars (0–100)
- Highlight if `dissent` is non-null: amber warning card

#### 10.7 Calibration Transparency Card
**Component**: `components/calibration-badge.tsx`
**Placement**: Header of Trades tab + right pane desktop

```
┌─────────────────────────────────────┐
│  ENGINE CALIBRATION                 │
│  ECE 0.032  ● OK                    │
│  Floor: 55%  |  Brier: 0.187        │
│  200-day window · 124 samples       │
└─────────────────────────────────────┘
```

- Calls `GET /api/internal/ops/calibration?window=200` (no auth token needed)
- Poll interval: every 5 minutes or on tab focus
- Drift badge: green/amber/rose per `DriftState`
- Clicking expands to show selectivity table (top 10/25/50% win rates)

---

### TIER 3 — Power-user & ops

#### 10.8 Engine Health Banner
**Component**: `components/engine-health-banner.tsx`
**Placement**: Top of every screen, only visible when not OK

```
┌────────────────────────────────────────────────────────┐
│  ⚠  ENGINE DEGRADED  ·  Swarm consensus unavailable   │
│  Analysis will use fallback model.  [Details]          │
└────────────────────────────────────────────────────────┘
```

- Calls `GET /api/health/engine` on mount + 60s interval
- Hidden when `status === "ok"` and no warnings
- Frozen state: red full-width banner — "Execution frozen by institutional gate"
- `[Details]` opens a panel showing `warnings[]` and `frozenBy`

#### 10.9 Macro / Earnings Countdown Widget
**Component**: `components/macro-calendar.tsx`
**Placement**: Right pane desktop, collapsible in Radar tab

Reads `auditAdvanced.gates[]` from latest scan/analysis:

```
┌──────────────────────────────────────┐
│  MACRO FLAGS                         │
│  NVDA  Earnings in 3d  ⚠            │
│  SPY   CPI in 2d       ⚠            │
│  All clear for AAPL    ✓             │
└──────────────────────────────────────┘
```

- Parse `gates[]` strings for "earnings", "FOMC", "CPI", "NFP" keywords
- Red for active flag, green for clear
- No external data call — derives from existing scan/analyze payload

#### 10.10 Settings / Preferences Screen
**Component**: `components/screens/settings-screen.tsx`
**Placement**: Desktop left-pane "Settings" section; swipe-up on mobile Money tab

Sections:
1. **Account** — email (read-only), sign-out button
2. **Safety Mode** — 3-button group: Training Wheels / Normal (locked) / Pro (locked)
   - Locked until 200 paper trades complete — show progress `47 / 200`
3. **Paper Mode** — toggle with confirmation modal
4. **Export Data** — "Download Journal CSV" button → calls journal performance endpoint + format client-side

---

## 11 · Interaction & Motion Rules

- No animation libraries — CSS transitions only (`transition-all duration-150`)
- Loading skeletons: `animate-pulse bg-[#1f1f1f]` blocks, matching final layout shape
- Sheet/drawer open: `translate-y-0` → `translate-y-full` (200ms ease-out)
- Sniper countdown: existing `SniperOverlay` — do not change
- Tab switches: instant — no slide animation (information density > delight)
- Touch targets: minimum 44×44 px on mobile

---

## 12 · Build Rules for v0 Output

1. Place new screens in `components/screens/`
2. Place new shared widgets in `components/`
3. Use `"use client"` only where hooks are used (data components should be server-first where possible)
4. Call `useAuth()` and `useTrade()` from existing context — do not duplicate state
5. Import via `@/` alias — never relative paths from deep directories
6. Tailwind classes only — no inline `style={}` except for dynamic values unavoidable in Tailwind
7. Do not rename any existing API path, type name, or design token
8. Every new component needs: loading skeleton, empty state, error state
9. Do not introduce recharts, d3, framer-motion, or any new runtime dependency without asking
10. Keep desktop 3-pane + mobile tab — both must work

---

## 13 · Copy / String Conventions

- Section headers: ALL CAPS, monospace (`font-mono tracking-wider text-xs text-[#6b6b6b]`)
- Metric values: large, semibold (`text-2xl font-semibold`)
- Sublabels: `text-xs text-[#6b6b6b]`
- Pnl positive: `text-[#00ff88]`, negative: `text-[#ff4444]`
- Tickers always uppercase monospace
- Percentages: 1 decimal place (`71.4%`)
- Currency: 2 decimal places (`$142.80`), no thousands separator below $10k
- R-multiples: `+1.2R` / `-0.7R` (always include sign)

---

## 14 · Sample Paste Prompt for v0.dev

Copy this verbatim as the v0.dev prompt, optionally append a section from §10:

```
Build UI for TradeSwarm — a Next.js 15 App Router tactical trading dashboard.

CONSTRAINTS (non-negotiable):
- Tailwind CSS only. No new deps without asking.
- Exact design tokens: bg #0a0a0a, card #141414, border #1f1f1f, accent #00ff88,
  warning #ffcc00, danger #ff4444, radius 10px.
- Monospace for tickers, scores, telemetry. System-ui body.
- Keep all existing API route paths, type names, and context method signatures.
- Both desktop (3-pane) and mobile (tab bar) must work.

EXISTING (do not regenerate):
app.tsx shell, tab-bar, trade-card, receipt-drawer, sniper-overlay,
learn-why-modal, theme-card, radar-screen, trades-screen, money-screen,
internal/ops CP3 dashboard.

Context providers available: useAuth(), useTrade() — do not duplicate state.

Each new component needs: loading skeleton (animate-pulse), empty state, error state.

[PASTE TARGET SECTION FROM §10 HERE]
```

---

## 15 · Open Questions (resolve before each sprint)

1. **Journal tab placement** — new 4th tab on mobile, or sub-section within Trades?
2. **Watchlist persistence** — Supabase query direct from component, or add to TradeContext?
3. **Calibration badge** — always visible in header, or only when drift ≠ OK?
4. **Performance analytics** — inline in Journal screen, or dedicated full screen?
5. **Engine health banner** — poll on an interval, or rely on manual refresh?
6. **CP4 strategy-regime matrix** — once built, does it live in the Journal screen or get its own Attribution screen?
7. **Settings unlock flow** — modal confirmation when reaching 200 trades, or automatic?
