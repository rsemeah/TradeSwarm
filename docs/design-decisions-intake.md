# TradeSwarm — Design Decisions Intake
**TruthSerum Standard: Every claim cites code (path:line) or git reference.**
**Audit Date:** 2026-03-01 | **Branch:** `claude/truthserum-patches-tests-CbZ6i`

---

## SECTION A — Product Intent (Inferred, Evidence-Backed)

### What the app does

TradeSwarm is a paper-trading dashboard backed by a deterministic AI trade engine. The user flow is:

1. **Scan / Discover** — AI scans market themes and surfaces option spread candidates (PCS/CCS/CDS strategies).
2. **Preview / Analyze** — User triggers AI analysis on a theme/ticker; engine returns a `ProofBundle` (regime, risk, deliberation, scoring, preflight).
3. **Trade Card** — Shows GO/WAIT/NO verdict, trust score, bullets, audit panel, and action buttons.
4. **Execute / Simulate** — Execute calls `POST /api/trade/execute`; Simulate calls `POST /api/trade/simulate`. Both run `runCanonicalTrade` and persist a receipt.
5. **Receipt** — `CanonicalProofBundle` + determinism metadata (hash, seed) stored in `trade_receipts` DB table. UI surface: `ReceiptDrawer` component — **currently dead code, not wired**.
6. **Replay / Audit** — `GET /api/internal/ops/replay/[id]` reruns safety evaluation against the original market snapshot and compares determinism hashes.

**Evidence:**
- Flow definition: `app/api/trade/preview/route.ts:1-54`, `app/api/trade/execute/route.ts:1-92`
- Engine entry: `lib/engine/runCanonicalTrade.ts:300-328`
- Receipt persistence: `lib/engine/runCanonicalTrade.ts:237-265`
- Replay route: `app/api/internal/ops/replay/[id]/route.ts:1-22`

### Paper-only vs Execute divide

| Behavior | Evidence |
|---|---|
| `training_wheels` mode = max 1 trade/day | `app/api/trade/execute/route.ts:32-49` |
| `normal` = max 3/day | same |
| `pro` = max 10/day | same |
| Blocked trades do NOT write to `trades` table | `lib/engine/runCanonicalTrade.ts:207` — `if (input.mode !== "preview" && safety_status === "ALLOWED")` |
| Preview mode DOES write a receipt (always) | `lib/engine/runCanonicalTrade.ts:316` — `shouldPersist = mode === "preview" || ...` |
| Paper badge displayed in UI | `components/app.tsx:105-108`, `components/app.tsx:452-456` |
| `safety_mode` set per user in DB | `app/api/trade/preview/route.ts:20-27` — fetches `user_preferences.safety_mode` |

### Current user journey (click-by-click)

**Desktop (lg+ breakpoint):**
1. Land at `/` → `<App />` → auth redirect if not logged in (`components/app.tsx:60-64`).
2. 3-pane layout: left nav | center feed | right context (`components/app.tsx:192-436`).
3. Center pane shows `TradeCard` list in "card" view mode by default (`components/app.tsx:263-269`).
4. Click "Execute Trade →" on a GO card → `SniperOverlay` fires 3s countdown then hold-to-confirm (`components/trade-card.tsx:177, 195-202`).
5. SniperOverlay confirm → `executeTrade()` in TradeContext → `POST /api/trade/execute` (`lib/trade-context.tsx:45-82`).
6. Success/failure shown inline as notification (`components/screens/trades-screen.tsx:59-75`).
7. "See receipt ›" button at `components/trade-card.tsx:293-297` → opens **inline AuditPanel only** (NOT `ReceiptDrawer`). This is the primary UX gap.

**Mobile (< lg breakpoint):**
1. Same auth gate.
2. Tab bar (Radar/Trades/Money) at bottom (`components/app.tsx:458`).
3. `RadarScreen` → theme cards → calls `analyzeTheme()` → navigates to Trades tab with AI candidate.
4. `TradesScreen` → list of `TradeCard` components.
5. Same execute flow via `SniperOverlay`.

---

## SECTION B — IA + Route Map (Source of Truth)

### Pages

| Route | File | Purpose | UI Shell | Key Components | Data |
|---|---|---|---|---|---|
| `/` | `app/page.tsx:1-7` | Root entry | Renders `<App />` | `components/app.tsx` | Delegates to App |
| `/auth/login` | `app/auth/login/page.tsx` | Login form | Auth form | — | Supabase auth |
| `/auth/sign-up` | `app/auth/sign-up/page.tsx` | Registration | Auth form | — | Supabase auth |
| `/auth/sign-up-success` | `app/auth/sign-up-success/page.tsx` | Post-signup | Confirmation | — | — |
| `/auth/error` | `app/auth/error/page.tsx` | Auth errors | Error display | — | — |
| `/internal/ops` | `app/internal/ops/page.tsx:10-103` | Calibration monitor | Server-rendered dashboard | Inline components | `getCalibrationMetrics()`, `model_governance_log` |

### API Routes

| Route | File | Method | Auth | Purpose | Returns |
|---|---|---|---|---|---|
| `/api/trade/preview` | `app/api/trade/preview/route.ts:1-54` | POST | Supabase user | Preview trade (no execute) | `proofBundle`, `receiptId`, `blocked` |
| `/api/trade/execute` | `app/api/trade/execute/route.ts:1-92` | POST | Supabase user | Execute live trade | `tradeId`, `receiptId`, `proofBundle`, `blocked` |
| `/api/trade/simulate` | `app/api/trade/simulate/route.ts` | POST | Supabase user | Paper simulation | Similar to execute |
| `/api/trade/route` | `app/api/trade/route.ts` | — | — | Legacy/base trade route | — |
| `/api/scan` | `app/api/scan/route.ts:1-22` | POST | — | Run full options scan | Scan results (5-min cached) |
| `/api/scan/[scanId]` | `app/api/scan/[scanId]/route.ts` | GET | — | Fetch specific scan | Scan result |
| `/api/analyze` | `app/api/analyze/route.ts` | POST | — | Theme analysis (no persist) | `analysis`, `proofBundle`, `credibility` |
| `/api/learn-why` | `app/api/learn-why/route.ts` | POST | — | Explain blocked trade | Reasoning |
| `/api/watchlist` | `app/api/watchlist/route.ts` | POST | — | Add ticker to watchlist | Confirmation |
| `/api/health` | `app/api/health/route.ts` | GET | — | Service health check | Status |
| `/api/health/engine` | `app/api/health/engine/route.ts` | GET | — | Engine health | Engine status |
| `/api/journal/entry` | `app/api/journal/entry/route.ts` | POST | — | Add journal entry | — |
| `/api/journal/close` | `app/api/journal/close/route.ts` | POST | — | Close trade in journal | — |
| `/api/journal/performance` | `app/api/journal/performance/route.ts` | GET | — | Journal performance stats | — |
| `/api/internal/ops/replay/[id]` | `app/api/internal/ops/replay/[id]/route.ts:1-22` | GET | `x-internal-token` | Replay determinism check | `ReplayReport` |
| `/api/internal/ops/calibration-metrics` | `app/api/internal/ops/calibration-metrics/route.ts` | GET | — | Calibration metrics | — |
| `/api/internal/ops/validation-report` | `app/api/internal/ops/validation-report/route.ts` | GET | — | Validation report | — |
| `/api/internal/jobs/outcome-tracker` | `app/api/internal/jobs/outcome-tracker/route.ts` | POST | — | Track trade outcomes | — |
| `/api/internal/jobs/recalibrate` | `app/api/internal/jobs/recalibrate/route.ts` | POST | — | Trigger recalibration | — |

### Layouts

| File | Purpose |
|---|---|
| `app/layout.tsx:1-27` | Root HTML wrapper, title="TradeSwarm - Algorithmic Trading Dashboard", theme-color `#0a0a0a`, imports `globals.css` |

---

## SECTION C — UI System Inventory (Design Constraints)

### Design Tokens

**Source:** `tailwind.config.ts:1-53` + `app/globals.css:1-70`

| Token | Value | CSS Var | Usage |
|---|---|---|---|
| `background` | `#0a0a0a` | `--background` | Page background |
| `foreground` | `#ffffff` | `--foreground` | Primary text |
| `card` | `#141414` | `--card` | Card backgrounds |
| `card-foreground` | `#ffffff` | `--card-foreground` | Text on cards |
| `border` | `#1f1f1f` | `--border` | All borders |
| `muted` | `#141414` | `--muted` | Disabled/secondary bg |
| `muted-foreground` | `#6b6b6b` | `--muted-foreground` | Secondary labels |
| `accent` / `primary` | `#00ff88` | `--accent`, `--primary` | CTAs, GO badge, trust bar fill, score bars |
| `warning` | `#ffcc00` | `--warning` | WAIT badge, simulation mode |
| `danger` | `#ff4444` | `--danger` | NO badge, blocked state, sign-out |
| `radius` | `10px` | `--radius` | Border radius |
| `max-w-phone` | `420px` | — | Mobile max width |

### Typography
- **Body:** `system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto` (`tailwind.config.ts:24`)
- **Monospace:** `ui-monospace, SFMono-Regular, SF Mono, Menlo` (`tailwind.config.ts:27`) — used for: ticker symbols, trust score, amounts, timestamps

### Animations (globals.css:30-60)
- `animate-pulse-glow` — green glow, 2s infinite (used for GO badge attention state)
- `slideUp` / `slideDown` — translate Y 100%→0% (for drawers/overlays)
- `spin` — rotation (used in SniperOverlay middle ring)

### UI Patterns In Use

| Pattern | Component | File:Line | Notes |
|---|---|---|---|
| Tab bar | `TabBar` | `components/tab-bar.tsx` | Bottom fixed on mobile |
| Card | inline in `TradeCard` | `components/trade-card.tsx:211` | `rounded-[10px] border border-border bg-card p-4` |
| Full-screen overlay | `SniperOverlay` | `components/sniper-overlay.tsx:48` | `fixed inset-0 z-50`, `bg-black/90` |
| Bottom sheet drawer | `ReceiptDrawer` | `components/receipt-drawer.tsx:93-95` | `fixed inset-0 z-50`, `absolute bottom-0`, `rounded-t-2xl` |
| Modal (inline expand) | AuditPanel, Reasoning Drawer | `components/trade-card.tsx:308-385` | Not a true modal; expands in-card |
| Notification toast | inline in TradesScreen | `components/screens/trades-screen.tsx:60-75` | Timed 3s auto-dismiss |
| Progress bar | `ScoreBar`, `TrustMeter` | `receipt-drawer.tsx:58-65`, `trade-card.tsx:39` | `h-1.5`/`h-2.5` rounded bar |
| User dropdown | inline in `AppContent` | `components/app.tsx:128-188` | `z-[60]` — ABOVE overlay z-50 |

### Known UX / z-index Issues

**CRITICAL — z-index conflict:**
- `SniperOverlay`: `z-50` container, `z-40` backdrop (`sniper-overlay.tsx:48-49`)
- `ReceiptDrawer`: `z-50` container, `z-40` backdrop (`receipt-drawer.tsx:93-94`)
- User menu dropdown: `z-[60]` (`app.tsx:143`) — renders ABOVE both overlays
- If `SniperOverlay` is open and `showUserMenu` is true, the dropdown bleeds over the execution UI. **This is a real bug once ReceiptDrawer is wired.**

**pointer-events:**
- ReceiptDrawer backdrop: `<div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />` (receipt-drawer.tsx:94) — correctly clickable for dismiss
- SniperOverlay backdrop: `<div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-sm" />` (sniper-overlay.tsx:49) — no `onClick`, but doesn't block child buttons since they are `z-50`
- **No `pointer-events-none` bugs found yet** in existing wired components

**Dark mode toggle:**
- `isDarkMode` state exists in `AppContent` (`app.tsx:36`) but setting it does NOT apply a class to the root — it only controls the toggle icon and a settings radio. **The dark mode toggle is cosmetically broken** — the app is always dark via CSS variables.

---

## SECTION D — Core Screens & Components (What Exists)

### Component Status Matrix

| Component | File | Exports | Status | Imported By |
|---|---|---|---|---|
| `App` | `components/app.tsx` | `App` (named) | ✅ USED | `app/page.tsx` |
| `TradeCard` | `components/trade-card.tsx` | `TradeCard` (named) | ✅ USED | `components/app.tsx:14`, `components/screens/trades-screen.tsx:4` |
| `ReceiptDrawer` | `components/receipt-drawer.tsx` | `ReceiptDrawer`, `ReceiptData` (named) | ❌ DEAD CODE — 0 imports | nowhere |
| `SniperOverlay` | `components/sniper-overlay.tsx` | `SniperOverlay` (named) | ✅ USED | `components/trade-card.tsx:7` |
| `LearnWhyModal` | `components/learn-why-modal.tsx` | `LearnWhyModal` (named) | ✅ USED | `components/trade-card.tsx:8` |
| `TabBar` | `components/tab-bar.tsx` | `TabBar` (named) | ✅ USED | `components/app.tsx:6` |
| `LoadingLogo`, `HeaderLogo` | `components/logo.tsx` | both named | ✅ USED | `components/app.tsx:12` |
| `RadarScreen` | `components/screens/radar-screen.tsx` | `RadarScreen` (named) | ✅ USED | `components/app.tsx:7` |
| `TradesScreen` | `components/screens/trades-screen.tsx` | `TradesScreen` (named) | ✅ USED | `components/app.tsx:8` |
| `MoneyScreen` | `components/screens/money-screen.tsx` | `MoneyScreen` (named) | ✅ USED | `components/app.tsx:9` |
| `ThemeCard` | `components/theme-card.tsx` | `ThemeCard` (named) | ✅ LIKELY USED | `components/screens/radar-screen.tsx` (inferred) |
| `DealCard` | `components/DealCard.tsx` | `DealCard` (named) | ⚠️ INTERNAL ONLY | `components/DealList.tsx` only |
| `DealList` | `components/DealList.tsx` | `DealList` (named) | ❌ DEAD CODE — 0 imports | nowhere |
| `ProofDrawer` | `components/ProofDrawer.tsx` | `ProofDrawer` (named) | ❌ DEAD CODE — 0 imports | nowhere |
| `ScanControls` | `components/ScanControls.tsx` | — | ❓ UNKNOWN — not verified | — |

### TradeCard Deep Anatomy (`components/trade-card.tsx`)

| Sub-element | Lines | What it does | State/props |
|---|---|---|---|
| `StatusBadge` | 15-28 | GO/WAIT/NO colored badge with glow on GO | `candidate.status` |
| `TrustMeter` | 30-52 | Score bar + win likelihood pct | `candidate.trustScore`, `candidate.winLikelihoodPct` |
| `BulletPoint` | 54-68 | WHY / RISK / AMOUNT color-coded bullets | `type`, `text` |
| `AuditPanel (simple)` | 72-101 | Formatted key/value list of audit simple fields | `candidate.auditSimple` |
| `AuditPanel (advanced)` | 103-161 | Extended metrics + scoring breakdown + gates | `candidate.auditAdvanced`, `candidate.scoring` |
| Execute button | 244-250 | Triggers SniperOverlay with mode="execute" | disabled when `isLoading` |
| Simulate button | 251-258 | Triggers SniperOverlay with mode="simulate" | — |
| "See receipt ›" | 290-298 | **Toggles `showAudit` (AuditPanel), NOT ReceiptDrawer** | `showAudit` boolean |
| "Reasoning drawer ›" | 299-305 | Toggles inline reasoning panel | `showReasoning` boolean |
| `SniperOverlay` | 195-202 | Rendered when `showSniper !== null` | 3s countdown + hold-to-confirm |
| `LearnWhyModal` | 204-209 | Rendered when `showLearnWhy === true` | for NO/WAIT trades |

### ReceiptDrawer Full Anatomy (`components/receipt-drawer.tsx:1-230`)

**This component is fully built but receives zero imports.** It has TWO implementation fragments in the same file (a partial first draft at lines 1-49 and the real implementation at lines 50-230 — both exported as `ReceiptDrawer`). The second definition overwrites the first.

| Prop | Type | Source |
|---|---|---|
| `isOpen` | `boolean` | caller state |
| `onClose` | `() => void` | caller handler |
| `receipt` | `ReceiptData \| null` | mapped from trade result |

```typescript
// receipt-drawer.tsx:6-17
export interface ReceiptData {
  proofBundle: ProofBundle           // from lib/types/proof.ts
  executedAt: Date
  isSimulation: boolean
  scoring?: TradeScoringDetail       // from lib/types.ts
  gates?: { name: string; passed: boolean; value: string; threshold: string }[]
}
```

Tabs rendered: `summary | regime | risk | deliberation (AI Rounds) | scoring`

Determinism fields displayed (receipt-drawer.tsx:222-226):
- `proofBundle.requestId`
- `proofBundle.risk.monteCarloSeed`

**Missing from ReceiptDrawer display:** `determinism_hash`, `market_snapshot_hash`, `config_hash`, `random_seed` — these exist in `CanonicalProofBundle.metadata.determinism` but `ReceiptDrawer` takes `ProofBundle` (legacy type), not `CanonicalProofBundle`.

---

## SECTION E — Data Contracts (What UI Must Match)

### Primary Types Hierarchy

```
lib/types/proof.ts          — ProofBundle + all sub-types (used by ReceiptDrawer)
lib/types/proof-bundle.ts   — CanonicalProofBundle v2 + CandidateProofBundle v3
lib/types.ts                — TradeCandidate, Portfolio, Theme, TradeScoringDetail (used by TradeCard, App)
```

### TradeCandidate (UI layer — `lib/types.ts:44-59`)

```typescript
interface TradeCandidate {
  ticker: string
  strategy: string
  status: "GO" | "WAIT" | "NO"
  trustScore: number               // 0-100
  winLikelihoodPct: number | null
  amountDollars: number | null
  bullets: { why: string; risk: string; amount: string }
  auditSimple: AuditSimple         // lib/types.ts:23-31
  auditAdvanced: AuditAdvanced     // lib/types.ts:33-41
  scoring?: TradeScoringDetail     // lib/types.ts:61-78
}
```

**Where produced:** `lib/trade-context.tsx:207-239` (from `analyzeTheme` API response), `lib/mock-data.ts` (static fallback)
**Where consumed:** `components/trade-card.tsx`, `components/app.tsx:44-50`, `components/screens/trades-screen.tsx:18-20`

### ProofBundle (engine output — `lib/types/proof.ts:149-195`)

```typescript
interface ProofBundle {
  requestId: string
  action: "execute" | "simulate" | "preview"
  ticker: string
  engineVersion: string
  marketContext: MarketContext      // includes volatile fields: ts, requestId
  regime: ProofRegimeSnapshot      // trend, volatility, momentum, score, confidence
  risk: ProofRiskSnapshot          // simCount, monteCarloSeed, medianPL, pct10/90, sharpeRatio, kellyFraction
  deliberation: DeliberationRound[] // ROUND1/ROUND2/ARBITRATION stages
  scoring: ScoringResult           // trustScore, agreementRatio, penaltyFactor
  preflight: PreflightResult       // pass/fail with named gates
  finalDecision: {
    action: TradeDecision          // "GO" | "WAIT" | "NO"
    reason: string
    trustScore: number
    recommendedAmount: number | null
    bullets?: { why: string; risk: string; amount: string }
  }
  engineDegraded: boolean
  warnings: string[]
  events: EngineEventMinimal[]
  ts: string
}
```

**Where produced:** `lib/engine/orchestrator.ts` (runTradeSwarm)
**Where consumed:** `lib/engine/runCanonicalTrade.ts` (wraps it), `components/receipt-drawer.tsx` (via ReceiptData prop — but unwired)

### CanonicalProofBundle (API response — `lib/types/proof-bundle.ts:206-242`)

```typescript
interface CanonicalProofBundle {
  version: "v2"
  model_provider: string
  model_version: string
  regime_snapshot: Record<string, unknown>
  risk_snapshot: Record<string, unknown>
  safety_decision: SafetyDecision        // ALLOWED | BLOCKED + reason_code
  model_rounds: ModelRound[]
  consensus_score: number
  trust_score: number
  execution_mode: "preview" | "simulate" | "execute"
  timestamp: string
  input_snapshot: { ticker, requested_amount, balance, safety_mode, theme, user_context }
  market_snapshot: {
    quote: unknown                        // ⚠️ contains volatile fetchedAt
    chain: unknown                        // ⚠️ contains volatile fetchedAt
    provider_health: unknown              // ⚠️ contains volatile latencyMs, fetchedAt
    as_of: string                         // ⚠️ volatile timestamp
    source?: string
    latency_ms?: number                   // ⚠️ volatile
  }
  metadata?: {
    request_id?: string
    engine_version?: string
    warnings?: string[]
    safety_status?: string
    reason_code?: string | null
    determinism?: DeterminismContext       // key structure for replay
  }
}
```

**DeterminismContext (`lib/types/proof-bundle.ts:191-200`):**
```typescript
interface DeterminismContext {
  market_snapshot_ref: string | null       // DB foreign key to market_snapshots
  market_snapshot_hash: string             // SHA256 of market_snapshot
  engine_version: string
  config_hash: string                      // SHA256 of {execution_mode, safety_mode, theme}
  determinism_hash: string                 // SHA256 of {input_snapshot, market_snapshot_hash, engine_version, config_hash, random_seed}
  random_seed: number | null
  monte_carlo_seed?: number | null
}
```

**Where produced:** `lib/engine/runCanonicalTrade.ts:93-162` (buildCanonicalProofBundle)
**Where consumed:** `app/api/trade/preview/route.ts`, `app/api/trade/execute/route.ts` (returned to UI), `lib/engine/replayTrade.ts` (read from DB), `lib/engine/runCanonicalTrade.ts:267-298` (enforceReplayPolicy)

### ReplayReport (`lib/engine/replayTrade.ts:1-25`)

```typescript
interface ReplayReport {
  tradeId: string
  match: boolean
  inputSnapshot: CanonicalProofBundle["input_snapshot"]
  marketSnapshot: CanonicalProofBundle["market_snapshot"]
  originalSafetyDecision: SafetyDecision
  replaySafetyDecision: SafetyDecision
  diffs: ReplayDiff[]
  mismatchClassification: "none" | "data_mismatch" | "nondeterministic_logic" | "version_drift"
}
```

**Where produced:** `lib/engine/replayTrade.ts`
**Where consumed:** `app/api/internal/ops/replay/[id]/route.ts` (returned to caller), UI has no surface for this yet

### Portfolio (`lib/types.ts:62-80`)

```typescript
interface Portfolio {
  balance: number
  dayPnl: number
  drawdownPct: number
  drawdownLimitPct: number
  tradesToday: number
  tradesTodayMax: number
  paperTradesCompleted: number
  paperTradesRequired: number
  safetyMode: "training_wheels" | "normal" | "pro"
  weekStats: WeekStats
  dailySummary: string
}
```

**Where produced:** `lib/mock-data.ts` (static), live data from Supabase not yet surfaced in UI
**Where consumed:** `components/screens/money-screen.tsx`, `components/app.tsx:90-95` (header balance/pnl)

### Volatile Fields in Market Snapshot (Root cause of determinism failures)

**Evidence: `lib/types/proof.ts:20-46`**

```typescript
// UnderlyingQuote — fetchedAt changes every API call
interface UnderlyingQuote {
  fetchedAt: string   // proof.ts:27 — VOLATILE
  ...
}

// OptionsChain — fetchedAt changes every API call
interface OptionsChain {
  fetchedAt: string   // proof.ts:34 — VOLATILE
  ...
}

// ProviderHealth — both latencyMs and fetchedAt are volatile
interface ProviderHealth {
  latencyMs: number   // proof.ts:42 — VOLATILE
  cached: boolean     // proof.ts:43
  fetchedAt: string   // proof.ts:45 — VOLATILE
  ...
}
```

**Evidence: `lib/engine/runCanonicalTrade.ts:107-116`** — `normalizedMarketSnapshot` includes all three of these as-is:
```typescript
const normalizedMarketSnapshot = {
  quote: bundle.marketContext.quote,           // ← fetchedAt inside
  chain: bundle.marketContext.chain,           // ← fetchedAt inside
  provider_health: bundle.marketContext.providerHealth,  // ← latencyMs + fetchedAt inside
  as_of: bundle.marketContext.ts,             // ← volatile top-level
  source: "orchestrator.marketContext",
  latency_ms: undefined,
}
```

**Root cause:** `hashDeterministic(normalizedMarketSnapshot)` at line 116 hashes all of these volatile fields, so `market_snapshot_hash` changes on every call even with identical market data.

---

## SECTION F — Engine Boundaries That Affect UX

### Determinism / Replay Boundaries

| What must stay stable | What can change | Evidence |
|---|---|---|
| `input_snapshot` fields (ticker, amount, balance, safety_mode, theme) | `marketContext.ts` (top-level timestamp) | `runCanonicalTrade.ts:98-105` |
| Market quote/chain **price/volume data** | `quote.fetchedAt`, `chain.fetchedAt`, `providerHealth.latencyMs` | `lib/types/proof.ts:20-46` |
| `random_seed` (Monte Carlo seed) | Nothing — must be preserved from original | `runCanonicalTrade.ts:122` |
| `engine_version` | Only via explicit version bump | `runCanonicalTrade.ts:117-129` |
| `config_hash` inputs (execution_mode, safety_mode, theme) | — | `runCanonicalTrade.ts:117-121` |

**Replay policy gate** (`runCanonicalTrade.ts:267-298`):
- Triggered only on `mode === "execute"`
- Reads env vars: `REPLAY_COVERAGE_THRESHOLD` (default 0), `REPLAY_MISMATCH_THRESHOLD` (default 1)
- If both at defaults, gate is skipped — effectively no replay enforcement in current config
- UX implication: users can execute without replay passing today

### Safety Gates and UX

| Gate | Trigger | UI Behavior | Evidence |
|---|---|---|---|
| `PREFLIGHT_BLOCKED` | `bundle.preflight.pass === false` | `candidate.status = "NO"`, blocked button shown | `runCanonicalTrade.ts:69,78` |
| `SAFETY_THRESHOLD_FAILED` | `safety.allowed === false` | Same — NO card | `runCanonicalTrade.ts:71` |
| `REGIME_DISALLOWS_EXECUTE` | high volatility + weak momentum in execute mode | Blocks execute only; simulate still allowed | `runCanonicalTrade.ts:72-73` |
| `RISK_CAP_EXCEEDED` | `positionSizeRecommended > maxSizeHint` | Same — NO card | `runCanonicalTrade.ts:73` |
| `FINAL_DECISION_BLOCKED` | `bundle.finalDecision.action === "NO"` | NO card | `runCanonicalTrade.ts:70` |
| `INSTITUTIONAL_FREEZE_ACTIVE` | `shouldFreezeExecution()` returns true | 423 HTTP — UI shows reasonCode | `app/api/trade/execute/route.ts:54-65` |
| `DAILY_LIMIT_REACHED` | trades_today >= max for safety_mode | 429 HTTP — UI shows reasonCode | `app/api/trade/execute/route.ts:32-49` |

**Reason codes UI must handle:**
- `PREFLIGHT_BLOCKED`, `SAFETY_THRESHOLD_FAILED`, `REGIME_DISALLOWS_EXECUTE`, `RISK_CAP_EXCEEDED`, `FINAL_DECISION_BLOCKED`
- `DAILY_LIMIT_REACHED` — from execute route
- `INSTITUTIONAL_FREEZE_ACTIVE` — from execute route
- `UNAUTHORIZED`, `MISSING_TICKER`, `PREVIEW_FAILED`, `EXECUTE_FAILED` — HTTP error codes

**Current UX for reason codes:** `components/screens/trades-screen.tsx:69-73` shows `state.lastResult.reasonCode` as monospace text below notification. No structured reason code UI exists yet.

### Preview vs Execute Behavior

| Behavior | Preview | Simulate | Execute |
|---|---|---|---|
| Runs engine | ✅ | ✅ | ✅ |
| Writes `trade_receipts` | ✅ | ✅ | ✅ (if ALLOWED) |
| Writes `trades` | ❌ | ✅ (if ALLOWED) | ✅ (if ALLOWED) |
| Enforces replay policy | ❌ | ❌ | ✅ |
| Enforces daily limit | ❌ | ❌ | ✅ |
| Enforces institutional freeze | ❌ | ❌ | ✅ |
| Badge shown in UI | PAPER MODE | PAPER MODE | PAPER MODE |

**Evidence:** `runCanonicalTrade.ts:207, 267-268, 316`; `app/api/trade/execute/route.ts:32-65`

---

## SECTION G — Design Decisions We Must Make

| Decision Area | Repo Currently Implies | Ambiguous / Unknown | Options | Recommendation | Ask Rory If |
|---|---|---|---|---|---|
| **Receipt UX surface** | "See receipt ›" label exists in `TradeCard` (line 293) but opens AuditPanel inline, not ReceiptDrawer | Should receipt be a drawer (existing component), a full page, or inline expansion? | A: Wire `ReceiptDrawer` as bottom sheet (component is built). B: Add dedicated `/receipt/[id]` page. C: Keep inline AuditPanel, rename to "Audit" | **Option A** — `ReceiptDrawer` is built, just needs wiring. Zero new component work. | Does receipt need to be shareable via URL? If yes, → Option B |
| **Determinism hash display in receipt** | `ReceiptDrawer` only shows `requestId` and `monteCarloSeed` (lines 222-226). `determinism_hash`, `market_snapshot_hash`, `config_hash` exist in `CanonicalProofBundle.metadata.determinism` but drawer takes `ProofBundle` (legacy type) | Should ReceiptDrawer be upgraded to take `CanonicalProofBundle` or keep `ProofBundle` + add a separate determinism panel? | A: Upgrade `ReceiptData` to include `CanonicalProofBundle`. B: Add `determinismContext?: DeterminismContext` optional prop. C: Add a "Proof" tab to existing drawer | **Option B** — least breaking, most precise | Is the determinism panel for internal-only viewing or user-facing? |
| **Mock data vs live API data** | All main screens use `mockCandidates`, `mockPortfolio`, `mockRadarData` (`app.tsx:13`, `trades-screen.tsx:5`) | When does the app switch from mock to live? `?demo=1` shows DEMO badge but still uses mocks | A: Keep mocks until user explicitly triggers analyze. B: Add a loading state that calls `/api/scan` on mount. C: Separate demo/live toggle | **Option A** (status quo) for now, then add API-fed state per screen | Is the app expected to show real live data immediately on login, or only after user-triggered scans? |
| **Dark mode toggle** | Toggle exists in settings and header (`app.tsx:110-125, 379-385`) but does NOT apply a class to root — always dark | Is dark mode toggle supposed to work? Currently it mutates `isDarkMode` state but never uses it to change CSS | A: Wire `isDarkMode` to `document.documentElement.classList.toggle('dark')`. B: Remove toggle (app is always dark by design). C: Add light theme tokens | **Option B** — app is dark-first by brand, adding a broken UI element is worse | Does Rory want a light mode? If yes, add light theme tokens to tailwind.config.ts |
| **3-pane vs tab navigation** | Desktop has 3-pane (left nav + center feed + right context). Mobile has tabs. Both rendered in same `AppContent` (`app.tsx:81-461`) | Is there a breakpoint at which the mobile tab UI becomes primary? Currently `lg:hidden` makes mobile tabs invisible on desktop. 3-pane shows on desktop always | A: Keep dual layout (current). B: Make mobile tab UI primary, 3-pane secondary/opt-in. C: Merge into one responsive layout | **Option A** (current) is working, don't change until explicit ask | Does Rory want the tab UI to be the primary experience going forward? |
| **ReceiptDrawer duplicate implementation** | `receipt-drawer.tsx` has two `export function ReceiptDrawer` definitions (lines 31 and 67). The second overwrites the first. First fragment (lines 31-49) has slate-950 styling (different from design tokens). Second (lines 67-230) uses correct tokens | Which definition is canonical? | A: Delete lines 1-49 (the partial first draft). B: Keep both as named variants. | **Option A** — delete the partial draft, keep the full implementation at lines 50-230 | — (no ambiguity, clearly a draft fragment that should be removed) |
| **ScanControls wiring** | `components/ScanControls.tsx` exists but import status not verified | Is ScanControls imported anywhere? | A: Audit and wire if needed. B: Delete if truly dead. | UNKNOWN until grep confirmation | — |
| **Reason code UX** | reasonCode displayed as raw monospace string (`trades-screen.tsx:70-73`) | Should reason codes have human-readable explanations in UI? | A: Map reason codes to user-facing messages in UI. B: Keep technical codes visible (current). C: Add "Learn why" modal that explains each code | **Option A** — at minimum for `DAILY_LIMIT_REACHED` and `INSTITUTIONAL_FREEZE_ACTIVE` which users will encounter | What's the target user sophistication level? Technical traders vs retail? |
| **v0.dev primary target** | `docs/v0-handoff.md:208` asks: "desktop workspace as primary or mobile tab UX first?" | Unresolved | A: Desktop 3-pane first. B: Mobile tab first. C: Equal priority both. | Need answer from Rory | **Ask Rory**: Which layout is primary for v0 generation? |
| **Real money execution** | All UI says PAPER MODE. No live execution path exists in UI | When will live execution be added? Is the "Execute Trade →" button intended to trigger real orders? | A: Keep paper-only forever (practice app). B: Add live mode behind feature flag when broker integration exists. | Need answer from Rory | **Ask Rory**: Is live execution planned? If yes, what broker API? |

---

## SECTION H — Build Plan to V0 (Backlog + v0.dev Alignment)

### Priority Backlog (10 tickets to V0)

#### TICKET 1 — Fix volatile field hashing (blocks replay match)
- **Title:** `fix(determinism): strip volatile fields from market snapshot before hashing`
- **Owner:** Engine
- **Files:** `lib/engine/runCanonicalTrade.ts` (lines 107-116), optionally `lib/engine/determinism.ts`
- **Definition of Done:**
  - Add `stripVolatile()` recursive sanitizer with `VOLATILE_KEYS = Set([fetchedAt, latencyMs, provider_health, providerHealth, cachedAt, cacheHit, cached, requestId, traceId, sessionId, as_of, asOf])`
  - Apply to `quote`, `chain`, `provider_health` before hashing
  - `market_snapshot_hash` is identical on two consecutive `/api/trade/preview` calls with same market data
  - `mismatchClassification` returns `"none"` on replay
- **Risk:** If `quote.fetchedAt` is used in rendering anywhere, removing it from the hash only (not the object) is safe

#### TICKET 2 — Wire ReceiptDrawer into TradeCard
- **Title:** `feat(ui): wire ReceiptDrawer into TradeCard post-execute/simulate`
- **Owner:** UI
- **Files:** `components/trade-card.tsx`, `components/receipt-drawer.tsx`
- **Definition of Done:**
  - `useState<ReceiptData | null>(null)` in TradeCard
  - After `handleSniperConfirm()` resolves, if `state.lastResult.data` contains a `proofBundle`, map it to `ReceiptData` and set drawer open
  - "See receipt ›" button opens `ReceiptDrawer` (not AuditPanel)
  - `ReceiptDrawer` renders with correct `proofBundle.finalDecision`, regime, risk, deliberation tabs
  - **Also:** delete duplicate first draft at `receipt-drawer.tsx:1-49` (keep lines 50-230)
- **Risk:** `state.lastResult.data` from execute API may not include full ProofBundle yet — verify execute route returns `proofBundle` in response body

#### TICKET 3 — Add determinism fields to ReceiptDrawer
- **Title:** `feat(ui): display determinism_hash + market_snapshot_hash in ReceiptDrawer`
- **Owner:** UI + Engine (type change)
- **Files:** `components/receipt-drawer.tsx`, `lib/types/proof.ts` or `ReceiptData` interface
- **Definition of Done:**
  - `ReceiptData` extended with optional `determinismContext?: DeterminismContext`
  - ReceiptDrawer "Summary" tab shows: `determinism_hash` (truncated 8 chars), `market_snapshot_hash` (truncated 8 chars), `random_seed`, `engine_version`
  - Fields labeled as "Proof Fingerprint" section
  - No field is `undefined` displayed — show `—` fallback
- **Risk:** `DeterminismContext` comes from `CanonicalProofBundle.metadata.determinism`, not from `ProofBundle` — the mapping layer in TradeCard must bridge these

#### TICKET 4 — Add replay smoke test script
- **Title:** `test(replay): add scripts/replay_smoke.sh`
- **Owner:** Engine/Test
- **Files:** `scripts/replay_smoke.sh` (new file)
- **Definition of Done:**
  - Script calls preview → extracts `tradeId` → calls replay → asserts `match: true`
  - Exits non-zero if `match: false` or `tradeId` missing
  - Works with `BASE=http://localhost:3000`
- **Risk:** Replay route requires `x-internal-token` header — script must include it

#### TICKET 5 — Fix dark mode toggle
- **Title:** `fix(ui): wire isDarkMode state to root class`
- **Owner:** UI
- **Files:** `components/app.tsx` (line 36, 110-125)
- **Definition of Done:**
  - Toggle applies `dark` class to `document.documentElement`
  - OR: remove toggle entirely and document that app is dark-only
- **Risk:** Light theme tokens do not exist — if keeping toggle, must add light token set to tailwind.config.ts

#### TICKET 6 — Remove dead component drafts
- **Title:** `chore(cleanup): remove dead component code and draft fragments`
- **Owner:** UI
- **Files:** `components/receipt-drawer.tsx` (lines 1-49), `components/DealList.tsx` (if unused), `components/ProofDrawer.tsx` (if unused)
- **Definition of Done:**
  - Grep confirms 0 imports for each deleted file/section
  - `receipt-drawer.tsx` has single clean implementation starting at line ~50
- **Risk:** Low — confirmed 0 imports

#### TICKET 7 — z-index audit and fix
- **Title:** `fix(ui): resolve z-index conflicts between SniperOverlay, ReceiptDrawer, and user menu`
- **Owner:** UI
- **Files:** `components/app.tsx:143`, `components/sniper-overlay.tsx:48`, `components/receipt-drawer.tsx:93`
- **Definition of Done:**
  - User menu dropdown does NOT render above SniperOverlay or ReceiptDrawer when either is open
  - Establish z-index scale: base=10, overlays=50, critical=60
  - Add `pointer-events-none` or `z-index` coordination rule
- **Risk:** Changing z-[60] on user menu may affect other stacking contexts

#### TICKET 8 — Wire live Portfolio data from Supabase
- **Title:** `feat(data): replace mockPortfolio with live Supabase fetch`
- **Owner:** Data + UI
- **Files:** `components/app.tsx:13,90-95`, `components/screens/money-screen.tsx`, `lib/mock-data.ts`
- **Definition of Done:**
  - `portfolio_stats` table queried in App or MoneyScreen
  - `balance`, `dayPnl`, `tradesToday`, `safetyMode` populated from DB
  - Mock data used as fallback only when DB returns null
- **Risk:** Requires `portfolio_stats` view/table to exist in Supabase schema — check migrations

#### TICKET 9 — Reason code user-facing messages
- **Title:** `feat(ui): map API reason codes to human-readable error messages`
- **Owner:** UI
- **Files:** `components/screens/trades-screen.tsx:69-73`, `lib/trade-context.tsx`
- **Definition of Done:**
  - Map of `reasonCode → message`:
    - `DAILY_LIMIT_REACHED` → "You've used all your trades for today. Come back tomorrow."
    - `INSTITUTIONAL_FREEZE_ACTIVE` → "Trading is paused while governance checks complete."
    - `PREFLIGHT_BLOCKED` → "This trade didn't pass safety preflight."
    - `REGIME_DISALLOWS_EXECUTE` → "Market regime is too volatile to execute right now."
  - Notification uses mapped message, not raw code
- **Risk:** Low

#### TICKET 10 — v0.dev UI generation for improved 3-pane layout
- **Title:** `feat(ui): generate improved 3-pane desktop workspace via v0.dev`
- **Owner:** UI (v0.dev)
- **Files:** `components/app.tsx` or new `components/workspace/`
- **Definition of Done:**
  - v0-generated component passes v0 acceptance checklist in `docs/v0-handoff.md:195-205`
  - Does not rename any type in `lib/types.ts`
  - Does not introduce new state library
  - ReceiptDrawer wired (depends on Ticket 2)
- **Risk:** High — v0 output may introduce naming drift; review all imports carefully before merging

---

### v0.dev Prompts (Copy-Paste Ready)

#### PROMPT 1: ReceiptDrawer Upgrade

```
Build a React component called ReceiptDrawer for a dark tactical trading dashboard called TradeSwarm.

EXISTING COMPONENT TO UPGRADE:
File: components/receipt-drawer.tsx
Current props interface:
  isOpen: boolean
  onClose: () => void
  receipt: ReceiptData | null

Where ReceiptData is:
  proofBundle: ProofBundle   (see types below)
  executedAt: Date
  isSimulation: boolean
  scoring?: TradeScoringDetail
  gates?: { name: string; passed: boolean; value: string; threshold: string }[]

ADD optional prop: determinismContext?: {
  determinism_hash: string
  market_snapshot_hash: string
  engine_version: string
  config_hash: string
  random_seed: number | null
  monte_carlo_seed?: number | null
}

DESIGN CONSTRAINTS (must match exactly):
- background: #0a0a0a, card: #141414, border: #1f1f1f
- accent (green): #00ff88, warning: #ffcc00, danger: #ff4444
- muted-foreground: #6b6b6b, foreground: #ffffff
- border-radius: 10px
- Tailwind classes only — no CSS-in-JS
- Monospace font for hashes, amounts, scores
- z-index: 50 for container, z-40 for backdrop
- "use client" directive required (uses useState)

LAYOUT:
- Fixed bottom sheet drawer: absolute bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl
- Drag handle at top (h-1 w-10 rounded-full bg-border)
- Header: ticker (font-mono text-2xl font-bold), action badge (GO/WAIT/NO with color), timestamp, engine version
- Tab bar: Summary | Regime | Risk | AI Rounds | Score | [Proof] (add Proof tab only if determinismContext provided)
- Scrollable content area max-h-[52vh]
- Footer: Export Proof button + Close button

TABS CONTENT:
- Summary: finalDecision.reason, trust score bar (h-1.5 rounded-full bg-accent), recommended amount
- Regime: trend, volatility, momentum, confidence percentage
- Risk: riskLevel, kellyFraction (3 decimals), positionSizeRecommended, maxDrawdown as percentage
- AI Rounds: list of deliberation rounds with stage label and outcome.reason
- Score: rawAvgScore, agreementRatio as percentage, penaltyFactor as percentage
- Proof (if determinismContext): show determinism_hash (first 12 chars + "..."), market_snapshot_hash (first 12 chars + "..."), engine_version, random_seed — labeled as "Proof Fingerprint" section

IMPORTANT:
- DO NOT use full-screen overlays that block clicks unless pointer-events are handled correctly on backdrop
- DO NOT break determinism receipt visibility — the Proof tab must always show if determinismContext is provided
- GO verdict → bg-accent/20 text-accent, WAIT → bg-warning/20 text-warning, NO → bg-danger/20 text-danger
- Export button downloads JSON of proofBundle with filename pattern: tradeswarm-proof-{ticker}-{requestId.slice(0,8)}.json

ProofBundle type reference (abbreviated):
  requestId: string, action: string, ticker: string, engineVersion: string
  finalDecision: { action: 'GO'|'WAIT'|'NO', reason: string, trustScore: number, recommendedAmount: number|null }
  regime: { trend: string, volatility: string, momentum: string, confidence: number }
  risk: { riskLevel: string, kellyFraction: number, positionSizeRecommended: number, maxDrawdown: number }
  deliberation: Array<{ roundId: number, stage: string, outcome: { reason: string } }>
  scoring: { rawAvgScore: number, agreementRatio: number, penaltyFactor: number }
  engineDegraded: boolean
```

---

#### PROMPT 2: TradeCard with ReceiptDrawer Wiring

```
Upgrade the TradeCard component in components/trade-card.tsx for a dark tactical trading dashboard called TradeSwarm.

EXISTING COMPONENT (do not rename or restructure — only add wiring):
File: components/trade-card.tsx
Current export: export function TradeCard({ candidate, onTradeComplete }: TradeCardProps)

EXISTING IMPORTS (keep all, add ReceiptDrawer):
  import { useState } from "react"
  import type { TradeCandidate } from "@/lib/types"
  import { getTrustScoreColor } from "@/lib/utils"
  import { useTrade } from "@/lib/trade-context"
  import { SniperOverlay } from "./sniper-overlay"
  import { LearnWhyModal } from "./learn-why-modal"
  // ADD:
  import { ReceiptDrawer, type ReceiptData } from "./receipt-drawer"

STATE TO ADD:
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)

BEHAVIOR CHANGE:
- "See receipt ›" button (currently at line ~293) must now OPEN ReceiptDrawer instead of toggling showAudit
- After handleSniperConfirm resolves, if state.lastResult?.data?.proofBundle exists, construct ReceiptData and setReceiptData + setReceiptOpen(true)
- ReceiptData construction:
    const rd = state.lastResult.data
    const receiptData: ReceiptData = {
      proofBundle: rd.legacyProofBundle ?? rd.proofBundle,
      executedAt: new Date(),
      isSimulation: showSniper === 'simulate',
      determinismContext: rd.proofBundle?.metadata?.determinism ?? null
    }
- Keep AuditPanel for "Under the Hood" (existing showAudit state), but "See receipt ›" now opens the drawer

RENDER ADDITION (inside return, after LearnWhyModal):
  <ReceiptDrawer
    isOpen={receiptOpen}
    onClose={() => setReceiptOpen(false)}
    receipt={receiptData}
  />

DESIGN CONSTRAINTS:
- background: #0a0a0a, card: #141414, border: #1f1f1f, accent: #00ff88, warning: #ffcc00, danger: #ff4444
- Tailwind classes only — no new CSS
- "use client" directive already present
- Do not change any existing internal components (StatusBadge, TrustMeter, BulletPoint, AuditPanel)
- Do not change SniperOverlay or LearnWhyModal wiring

DATA CONTRACT for state.lastResult.data (from /api/trade/execute or /api/trade/simulate):
  lastResult.data.proofBundle: CanonicalProofBundle  (has .metadata.determinism)
  lastResult.data.legacyProofBundle: ProofBundle     (has .finalDecision, .regime, .risk, .deliberation, .scoring)
  lastResult.data.receiptId: string | null
  lastResult.data.tradeId: string | null
  lastResult.data.blocked: boolean
```

---

#### PROMPT 3: Mobile TradesScreen + Notification Upgrade

```
Upgrade the TradesScreen component in components/screens/trades-screen.tsx for TradeSwarm.

EXISTING FILE: components/screens/trades-screen.tsx
EXISTING IMPORTS (keep all):
  import { useState } from "react"
  import { TradeCard } from "@/components/trade-card"
  import { mockCandidates, mockRadarData } from "@/lib/mock-data"
  import { useTrade } from "@/lib/trade-context"
  import type { TradeCandidate } from "@/lib/types"

CHANGES NEEDED:
1. Upgrade reason code display: replace raw reasonCode monospace text with human-readable messages:
   Map:
   - DAILY_LIMIT_REACHED → "You've reached today's trade limit. Resets at midnight ET."
   - INSTITUTIONAL_FREEZE_ACTIVE → "Trading paused — governance checks in progress."
   - PREFLIGHT_BLOCKED → "Trade didn't pass safety preflight checks."
   - REGIME_DISALLOWS_EXECUTE → "Market conditions too volatile to execute now."
   - RISK_CAP_EXCEEDED → "Position size exceeds your risk cap."
   - Default → show raw reasonCode if not in map

2. Success notification: add a brief "Receipt saved — tap card to view" message when success + receiptId present in state.lastResult.data

DESIGN CONSTRAINTS:
- background: #0a0a0a, card: #141414, border: #1f1f1f, accent: #00ff88, warning: #ffcc00, danger: #ff4444
- Tailwind only
- Mobile-first (max-w-[420px])
- Monospace for codes/amounts
- Keep "use client"
- Do not rename TradesScreenProps or change how candidates array is built

IMPORTANT: do not add new API calls — only use state from useTrade() hook.
```

---

#### PROMPT 4: Desktop 3-Pane Workspace Improvement

```
Improve the desktop 3-pane workspace section of components/app.tsx for TradeSwarm.

SCOPE: Only the desktop lg+ section (lines ~192-436 of app.tsx). Do not touch:
- The mobile tab section (lines ~439-459)
- Auth/provider wrappers (lines ~464-478)
- State declarations (lines ~29-43)
- Any context imports or hook usage

CURRENT ISSUES TO FIX:
1. Left pane has pane-width sliders exposed to users — hide these behind a "Developer" collapsible section
2. Receipts/Audit section (activeSection === "receipts-audit") renders a placeholder — replace with a real list of recent receipts if available, or a "No receipts yet — execute a trade" empty state
3. "My Money" and "Settings" sections currently don't respond to viewMode switch — correctly hide view mode toggle for these sections (already done in code at line 245, preserve this behavior)

DESIGN CONSTRAINTS (must match exactly):
- background: #0a0a0a, card: #141414, border: #1f1f1f
- accent: #00ff88, warning: #ffcc00, danger: #ff4444
- muted-foreground: #6b6b6b, foreground: #ffffff
- border-radius: 10px
- Tailwind only — no new CSS
- Data density: compact spacing, text-xs for labels, text-sm for values
- Monospace for numeric/ticker data
- "use client" already present — no change needed

SECTION IDs in left nav (preserve exactly):
  "feed-explorer", "market-context", "symbol-explorer", "news-narrative", "receipts-audit", "my-money", "settings"

ACTIVE SECTION HIGHLIGHT:
  bg-accent/15 text-foreground (currently correct — preserve)

DO NOT:
- Rename any type or variable
- Change API endpoint calls
- Add new state libraries
- Break the 3-column grid layout
- Modify mobile tab section
- Add full-screen overlays without pointer-events handling
- Break determinism receipt visibility
```

---

## Appendix: Files with Evidence Gaps

| Gap | What's Unknown | How to Resolve |
|---|---|---|
| `components/ScanControls.tsx` | Exports and import usage not verified | `grep -r "ScanControls" .` |
| `components/screens/radar-screen.tsx` | Full render tree not read — `ThemeCard` usage assumed | Read file |
| `components/screens/money-screen.tsx` | Full content not read | Read file |
| `app/api/trade/simulate/route.ts` | Not fully read — assumed similar to execute | Read file |
| `app/api/analyze/route.ts` | Not fully read — response shape partially known from trade-context.tsx | Read file |
| `lib/mock-data.ts` | mockCandidates shape not fully read | Read file to verify TradeCandidate shape |
| Live `portfolio_stats` DB table | Exists in migrations? | Check `scripts/` SQL files |
| `REPLAY_COVERAGE_THRESHOLD` env var | Set to 0 in prod? Gate is bypassed if defaults | Check `.env` / deployment config |
| `ScanControls.tsx` import status | 0 imports confirmed? | `grep -r "ScanControls" . --include="*.tsx" --include="*.ts"` |
