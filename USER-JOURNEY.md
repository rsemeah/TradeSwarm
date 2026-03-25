# TradeSwarm — Full User Journey

Complete map of every page, screen, overlay, and step a user encounters from first visit through trade execution.

---

## Pages Index

| Route | File | Purpose |
|-------|------|---------|
| `/auth/login` | `app/auth/login/page.tsx` | Sign in |
| `/auth/sign-up` | `app/auth/sign-up/page.tsx` | Create account |
| `/auth/sign-up-success` | `app/auth/sign-up-success/page.tsx` | Email confirmation prompt |
| `/auth/error` | `app/auth/error/page.tsx` | Auth error handler |
| `/` | `app/page.tsx` → `components/app.tsx` | Main authenticated app shell |
| `/internal/ops` | `app/internal/ops/page.tsx` | Internal ops/calibration dashboard |

---

## Step-by-Step User Journey

### Phase 1 — Authentication

**Step 1: Arrive at `/auth/login`**
- Logo + "TRADESWARM" wordmark shown
- User enters email + password
- "Don't have an account? Sign up" link navigates to `/auth/sign-up`
- On submit: Supabase `signInWithPassword` called
  - Success → redirect to `/`
  - Failure → inline error message shown in red

**Step 1a (new user): `/auth/sign-up`**
- Logo + "Create your account" subtitle
- User enters: Email, Password, Confirm Password
- Client-side validation: passwords must match, min 6 characters
- On submit: Supabase `signUp` called
  - Success → redirect to `/auth/sign-up-success`
  - Failure → inline error message shown

**Step 1b: `/auth/sign-up-success`**
- Green checkmark icon
- "Check your email" — confirmation link sent
- "Back to Sign In" button → `/auth/login`

**Step 1c (error): `/auth/error`**
- Red X icon
- Error message from `?error=` query param (or generic fallback)
- "Try Again" button → `/auth/login`

**Step 2: App shell loading**
- Middleware (`middleware.ts`) validates Supabase session on every route
- Unauthenticated users on any route → redirect to `/auth/login`
- On `/`, while session resolves: full-screen `LoadingLogo` spinner shown
- If no session after load → redirect to `/auth/login`

---

### Phase 2 — Main App: Radar Tab (Default)

> Mobile: bottom tab "Radar" | Desktop: left sidebar nav active

**Step 3: Radar Screen** (`components/screens/radar-screen.tsx`)
- Greeting text + "Here's what's heating up today"
- TradeSwarm header logo (top right)

**Step 4: Training Wheels Banner**
- Yellow banner: "Training Wheels ON - Max 1 trade/day - Paper mode"
- Sub-label: "Turn off after 200 trades"

**Step 5: Theme Cards** (`components/theme-card.tsx`)
- One card per market theme (e.g., AI Infrastructure, Biotech, Energy)
- Each card shows: heat badge (Hot / Warming / Quiet), theme name, tickers, coach brief
- Two actions per card:
  - **"See Best Trade →"** → triggers AI analysis (Step 6)
  - **"Watch Only"** → adds to watchlist via `/api/watchlist`, shows "Added to watchlist" toast (2s)

**Step 6: AI Analysis**
- Calls `analyzeTheme()` → POST `/api/analyze`
- Notification appears: "Analyzing [theme] with AI swarm..."
- Full-screen loading overlay activates (Step 7)

**Step 7: AI Analysis Loading Overlay**
- Background blurred, logo pulses
- "AI Swarm analyzing [theme]..." text
- "Groq + OpenAI consensus engine" sub-label
- Three bouncing dots animation
- On success → overlay dismissed, navigate to Trades Tab with AI candidate
- On failure → "Analysis failed. Using fallback data." (1.5s) → navigate to Trades with mock data

**Step 8: Navigate to Trades Tab**
- `activeTab` set to `"trades"`
- AI candidate placed first in candidates list

---

### Phase 3 — Main App: Trades Tab

> Mobile: bottom tab "Trades" | Desktop: middle pane, Feed Explorer section

**Step 9: Trades Screen** (`components/screens/trades-screen.tsx`)

**If no GO-status trades exist:**
- Empty state: "-" icon, "Sitting out today"
- "Markets aren't offering a clean opportunity today."
- "Next scan tomorrow at 6:00 AM ET"
- "Run a simulation anyway" button (currently no-op, available for future use)

**If GO trades exist:**
- Header: "Today's Trades" + last scan timestamp
- If AI candidate present: green badge "AI Swarm Analysis Complete - Groq + OpenAI + Claude"
- List of Trade Cards (AI candidate first, then mock candidates)
- Post-trade notification bar (success = green, failure = red, includes `reasonCode` if present)

**Step 10: Trade Card** (`components/trade-card.tsx`)

Each card contains:

| Element | Description |
|---------|-------------|
| Status Badge | GO (green glow) / WAIT (yellow) / NO (red) |
| Ticker + Strategy | Mono font ticker, strategy label |
| Trust Meter | 0–100 bar with color gradient + Win Likelihood % |
| Bullets | WHY (green dot), RISK (yellow dot), AMOUNT (green dot) |
| Amount Box | `$amount` centered — shown only for GO status |
| Action Buttons | Varies by status (see Step 11) |
| "See receipt ›" | Toggle Audit Panel — available for GO and WAIT only |
| "Reasoning drawer ›" | Toggle Reasoning Drawer — available for all |

**Step 11: Action Buttons by Status**

**GO status:**
- "Execute Trade →" → opens Sniper Overlay in LIVE FIRE mode (Step 12)
- "Simulate First" → opens Sniper Overlay in SIMULATION mode (Step 12)

**WAIT status:**
- "Watching..." → disabled, no action
- "Simulate Anyway" → opens Sniper Overlay in SIMULATION mode (Step 12)

**NO status:**
- "Blocked" → disabled, no action
- "Learn Why" → opens Learn Why Modal (Step 16)

---

### Phase 4 — Sniper Overlay (Trade Confirmation)

> `components/sniper-overlay.tsx` — full-screen modal, z-50

**Step 12: Overlay Opens**
- Background: black/90 with blur
- Crosshair UI: outer ring (pulsing), middle ring (rotating), inner ring, crosshair lines, corner brackets
- Info panel (top-left): STRATEGY, TRUST score, WIN%
- Timestamp (top-right): current time ET
- Mode badge: "LIVE FIRE" (green) or "SIMULATION" (yellow)
- Ticker in mono font, recommended amount below

**Step 13: 3-Second Countdown**
- Large countdown number (3 → 2 → 1) shown in yellow
- Label: "TARGETING"
- Confirm button disabled: "Acquiring Target..."

**Step 14: LOCKED State**
- Countdown reaches 0
- Label changes to "LOCKED / HOLD TO CONFIRM"
- Confirm button activates

**Step 15: Hold-to-Confirm**
- User holds confirm button (mouse or touch)
- Progress ring fills around the crosshair (0% → 100% over ~1 second)
- Button label shows live percentage: "47%", "83%", etc.
- At 100% → `onConfirm()` fires

**Step 15a: Cancel**
- "Cancel" text button available at any point
- Dismisses overlay, no trade placed

**Step 16: Trade Executed**
- Sniper overlay closes
- For "execute": POST `/api/trade/execute`
- For "simulate": POST `/api/trade/simulate`
- `onTradeComplete()` fires → notification shown in Trades Screen (3s auto-dismiss)
- Success: green bar with result message
- Failure: red bar with message + `reasonCode` in mono font

---

### Phase 5 — Trade Card: Audit Panel

> Accessible via "See receipt ›" link (GO and WAIT trades only)

**Step 17: Audit Panel Toggle**
- Expands inline below action buttons
- "Under the Hood" label with Simple / Advanced toggle tabs

**Step 17a: Simple View**
| Field | Value |
|-------|-------|
| Trust Score | N / 100 |
| Win Likelihood | % |
| Market Stability | text |
| Fill Quality | text |
| Recommended | $ amount |
| Decision | verdict + checkmark |

**Step 17b: Advanced View**
| Field | Value |
|-------|-------|
| Growth Score | decimal |
| Net ELR | decimal |
| POP Lower Bound | decimal |
| Kelly Final | decimal |
| Regime Score | decimal |
| Liquidity Score | decimal |
| Scoring Breakdown | factor contributions + penalties (if `scoring` present) |
| Gate Results | pass/fail list for each gate |

---

### Phase 6 — Trade Card: Reasoning Drawer

> Accessible via "Reasoning drawer ›" link (all trades)

**Step 18: Reasoning Drawer Toggle**
- Expands inline below the audit panel link row

**Step 18a: Factor Contributions**
- Regime alignment → bar (accent color)
- Liquidity quality → bar (accent color)
- Risk friction → bar (warning color)

**Step 18b: Feed Evidence**
- Macro feed confidence mapped to trust score
- Strategy context
- Primary rationale (why bullet)

**Step 18c: Timeline Deltas**
- T-15m: Regime score reading
- T-8m: Liquidity score reading
- T-0m: Final status resolved

---

### Phase 7 — Learn Why Modal (NO / WAIT trades)

> `components/learn-why-modal.tsx` — full-screen modal, z-50

**Step 19: Modal Opens**
- Status badge (WAIT=yellow, NO=red) + ticker
- "Learn why this trade was blocked" subtitle
- Calls POST `/api/learn-why` with ticker, status, strategy, bullets, trustScore

**Step 20: Loading State**
- Spinner: "Analyzing trade conditions..."

**Step 21: Explanation Loaded**

**Headline card**
- Summary reason the trade was blocked

**Simple / Technical toggle**
- Simple: ELI5 plain-language explanation
- Technical: detailed technical explanation

**Key Factors section**
- Color-coded factor cards:
  - Positive → green (accent)
  - Negative → red (danger)
  - Neutral → gray
- Each card: factor name, impact label, explanation text

**"To Make This a GO" section**
- Green-bordered box: what conditions need to change

**"Consider Instead" section** (if alternatives available)
- Alternative ticker + reason for each

**Step 22: Close Modal**
- "Got it" button (full-width) → closes modal
- Clicking backdrop → closes modal

---

### Phase 8 — Receipt Drawer (Proof Bundle)

> `components/receipt-drawer.tsx` — bottom sheet drawer, z-50

**Step 23: Drawer Opens**
- Triggered after trade execute/simulate completes (via trade context)
- Bottom sheet slides up, drag handle shown

**Header:**
- Status badge (GO/WAIT/NO) + engine-degraded badge if applicable
- Ticker (large mono font)
- Execution time ET + engine version
- Recommended amount (top right)

**Step 24: Tab Navigation**

| Tab | Contents |
|-----|---------|
| Summary | Decision reason, Trust Score with bar |
| Regime | Trend, Volatility, Momentum, Confidence % |
| Risk | Risk level, Kelly fraction, Position size, Max drawdown |
| AI Rounds | Each deliberation round: stage name + outcome reason |
| Score | Raw Avg Score, Agreement ratio, Penalty factor |

**Step 25: Export Proof**
- "Export Proof" button → downloads `tradeswarm-proof-{ticker}-{requestId}.json`

**Step 26: Close Drawer**
- "Close" button or backdrop tap → dismisses drawer

---

### Phase 9 — My Money Tab

> Mobile: bottom tab "My Money" | Desktop: left sidebar → "My Money" section

**Step 27: My Money Screen** (`components/screens/money-screen.tsx`)

**Balance Card**
- Practice Balance (large mono font)
- Today's P&L (green, accent color)
- "Paper mode · Not real money" disclaimer

**Safety Status Card**
- Safety Buffer drawdown bar (accent fill, stops at drawdown limit %)
- "Stops trading at N%" label
- Trades used today: "N of M allowed today"
- Safety Mode selector:
  - Training Wheels (active, accent border)
  - Normal (locked, 50% opacity)
  - Pro (locked, 50% opacity)
- "Unlock Normal after 200 practice trades" note

**Road to Real Money Card**
- Progress bar: `completed / 200` practice trades
- Checklist (all unchecked until goals met):
  - 200 practice trades completed
  - Max loss stayed under 15%
  - Wins matching expectations

**This Week Stats Card**
| Metric | Value |
|--------|-------|
| Trades | count |
| Wins | count |
| Win Rate | % |
| Avg Gain | $ |

**Today's Summary Card**
- Narrative text describing today's performance

**Account Card**
- User email address
- "Sign Out" button (red border) → Supabase `signOut()` → redirect to `/auth/login`

---

### Phase 10 — Desktop Layout (Additional Sections)

> Desktop only (`lg:` breakpoint) — 3-pane resizable layout

**Top Navigation Bar (persistent)**
- TradeSwarm logo
- Practice Balance + Today P&L
- PAPER MODE badge (pulsing yellow dot)
- DEMO DATA badge (if `?demo=1` param present)
- Dark/Light mode toggle
- User menu dropdown:
  - "Signed in as [email]"
  - Dashboard → Market Context section
  - My Money → Money section
  - Settings → Settings section
  - Sign Out

**Left Pane — Section Navigator**
- Section list (click to activate):
  - Feed Explorer (default)
  - Market Context
  - Symbol Explorer
  - News/Narrative
  - Receipts/Audit
  - My Money
  - Settings
- Resizable pane width sliders (16%–35%)

**Middle Pane — Active Section Content**

Feed view mode switcher (card / table / context / timeline) shown for all sections except My Money and Settings.

| View Mode | Shows |
|-----------|-------|
| Card | Trade Cards for all candidates |
| Table | Ticker, Status, Trust, Win%, Amount columns |
| Context | Theme cards: heat level, name, brief, tickers |
| Timeline | Chronological candidate status changes (T+Nm format) |

My Money section → same content as mobile My Money screen (balance, safety, progress, week stats)

Settings section:
- Account: user email
- Appearance: Dark Mode toggle
- Safety Mode: Training Wheels / Normal / Pro radio buttons
- Sign Out button

**Right Pane — Market Context (persistent)**
- Greeting text
- Feed Explorer view mode indicator
- Symbol Explorer: top candidate ticker
- News/Narrative: "AI infra narrative remains dominant into next scan."
- Receipts/Audit: last scan timestamp

---

## Complete Flow Diagram

```
Visit app
  │
  ├─ Not authenticated → /auth/login
  │     ├─ "Sign up" → /auth/sign-up → /auth/sign-up-success → /auth/login
  │     ├─ Auth error → /auth/error → /auth/login
  │     └─ Login success → /
  │
  └─ Authenticated → / (App)
        │
        ├─ [RADAR TAB — default]
        │     Theme Cards
        │       ├─ "Watch Only" → Watchlist saved → toast
        │       └─ "See Best Trade" → AI Analysis overlay
        │             ├─ Success → Trades Tab (AI candidate first)
        │             └─ Failure → Trades Tab (mock data)
        │
        ├─ [TRADES TAB]
        │     No GO trades → "Sitting out today" empty state
        │     GO trades → Trade Cards
        │       │
        │       ├─ GO status
        │       │     "Execute Trade" → Sniper Overlay [LIVE FIRE]
        │       │     "Simulate First" → Sniper Overlay [SIMULATION]
        │       │
        │       ├─ WAIT status
        │       │     "Watching..." → (disabled)
        │       │     "Simulate Anyway" → Sniper Overlay [SIMULATION]
        │       │
        │       └─ NO status
        │             "Blocked" → (disabled)
        │             "Learn Why" → Learn Why Modal
        │                   → loads /api/learn-why
        │                   → Headline, Simple/Technical view
        │                   → Key Factors, To Make This a GO
        │                   → Consider Instead (alternatives)
        │                   → "Got it" → close
        │
        │       Sniper Overlay (all trade types)
        │             3s countdown → LOCKED → Hold to Confirm
        │             ├─ Cancel → dismiss
        │             └─ Confirm (hold 100%) → execute/simulate API
        │                   → Post-trade notification (3s)
        │                   → Receipt Drawer opens
        │                         Summary / Regime / Risk / AI Rounds / Score tabs
        │                         Export Proof → download JSON
        │                         Close → back to Trades
        │
        │       "See receipt ›" → Audit Panel (Simple / Advanced)
        │       "Reasoning drawer ›" → Factor bars, Feed Evidence, Timeline
        │
        └─ [MY MONEY TAB]
              Balance Card → Practice balance + P&L
              Safety Status → Drawdown bar, trades today, mode selector
              Road to Real Money → progress bar + checklist
              This Week → trades, wins, win rate, avg gain
              Today's Summary → narrative text
              Account → email + Sign Out → /auth/login
```

---

## API Endpoints Called During User Journey

| Step | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| Sign in | Supabase SDK | — | `signInWithPassword` |
| Sign up | Supabase SDK | — | `signUp` |
| Sign out | Supabase SDK | — | `signOut` |
| Theme analysis | POST | `/api/analyze` | AI swarm analyzes a market theme |
| Watch ticker | POST | `/api/watchlist` | Add ticker to watchlist |
| Execute trade | POST | `/api/trade/execute` | Place live paper trade |
| Simulate trade | POST | `/api/trade/simulate` | Run trade simulation |
| Learn why | POST | `/api/learn-why` | AI explanation for blocked trade |
| Scan results | GET | `/api/scan/[scanId]` | Retrieve scan results |
| Trade preview | POST | `/api/trade/preview` | Preview trade before execution |
