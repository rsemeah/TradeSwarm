# TradeSwarm → v0.dev Complete Handoff

This handoff is intended to let v0 generate UI and scaffolding that aligns with the current TradeSwarm repository structure, naming, and contracts.

## 1) Product and app shape

- **App type**: Next.js App Router application.
- **Primary experience**:
  - Desktop: 3-pane “TradeSwarm Pro Workspace”.
  - Mobile: tabbed app with `Radar`, `Trades`, `My Money`.
- **Auth gate**: main app redirects unauthenticated users to `/auth/login`.
- **Current route structure**:
  - `app/page.tsx` → app shell.
  - `app/auth/*` → login/signup/error flows.
  - `app/api/*` → analyze, trade, health, watchlist, learn-why, and internal ops endpoints.

## 2) UI/brand constraints to preserve exactly

### Visual language

- Dark-first palette with neon green accent.
- Tone: “trader cockpit” / “tactical dashboard” rather than generic SaaS.
- Keep compact spacing and data density; prioritize information over decorative whitespace.

### Design tokens (match existing CSS/Tailwind)

- `background`: `#0a0a0a`
- `foreground`: `#ffffff`
- `card`: `#141414`
- `border`: `#1f1f1f`
- `muted-foreground`: `#6b6b6b`
- `accent`/`primary`: `#00ff88`
- `warning`: `#ffcc00`
- `danger`: `#ff4444`
- `radius`: `10px`
- max phone width target: `420px`

### Typography

- System UI stack for body.
- Monospace for ticker symbols / telemetry labels.

## 3) Core information architecture

### Desktop (lg+)

- **Pane 1 (left)**: top-level section selector + pane width sliders.
  - Sections: `Market Context`, `Feed Explorer`, `Symbol Explorer`, `News/Narrative`, `Receipts/Audit`.
- **Pane 2 (center)**: feed explorer with view-mode switch.
  - Modes: `card`, `table`, `context`, `timeline`.
- **Pane 3 (right)**: context summary blocks.

### Mobile (< lg)

- Tabbed shell:
  - `radar` tab → themes and candidate discovery.
  - `trades` tab → trade cards + execution/simulation actions.
  - `money` tab → bankroll/limits/performance.
- Persistent bottom tab bar.
- Practice-mode footer text.

## 4) Existing components to mirror/reuse in v0 output

- `components/app.tsx` (shell, responsive split behavior)
- `components/tab-bar.tsx`
- `components/trade-card.tsx`
- `components/receipt-drawer.tsx`
- `components/sniper-overlay.tsx`
- `components/learn-why-modal.tsx`
- `components/theme-card.tsx`
- `components/screens/radar-screen.tsx`
- `components/screens/trades-screen.tsx`
- `components/screens/money-screen.tsx`

## 5) Domain model contracts (frontend types)

v0-generated UI should preserve these concepts and naming to minimize integration edits:

- `Theme`
  - `name`, `heat`, `tickers[]`, `brief`
- `TradeCandidate`
  - `ticker`, `strategy`, `status: GO|WAIT|NO`, `trustScore`, `winLikelihoodPct`, `amountDollars`, `bullets`, `auditSimple`, `auditAdvanced`, optional `scoring`
- `Portfolio`
  - balance/day pnl/drawdown/trade limits/paper progress + weekly stats
- `TabId`
  - `radar | trades | money`

## 6) State and behavior contracts

- Keep provider pattern:
  - `AuthProvider` controls auth hydration and redirect behavior.
  - `TradeProvider` handles async trade actions and result state.
- Action methods expected by UI:
  - `executeTrade(trade)`
  - `simulateTrade(trade)`
  - `watchTicker(ticker, theme)`
  - `analyzeTheme(theme)`
  - `learnWhy(trade)`
  - `clearResult()`

## 7) API contracts the UI must align to

### POST `/api/analyze`

Request body:

```json
{
  "ticker": "NVDA",
  "theme": "AI Infrastructure",
  "marketContext": "Momentum intact",
  "useSwarm": true
}
```

Intended response usage:

- `analysis` (GO/WAIT/NO + bullets + sizing)
- `credibility` (normalized trust/scoring details)
- `engine.regime`, `engine.risk`
- `modelResults[]`
- `aiConsensus`
- `proofBundle`

### POST `/api/trade`

Request body:

```json
{
  "action": "execute",
  "trade": {
    "ticker": "NVDA",
    "strategy": "Bullish Spread - AI Analyzed",
    "status": "GO",
    "trustScore": 78,
    "amountDollars": 150,
    "bullets": {
      "why": "...",
      "risk": "...",
      "amount": "..."
    }
  }
}
```

Response shape:

- `success`
- `trade`
- `receipt`
- `message`
- optional `reasonCode` and error info

### POST `/api/watchlist`

Request body:

```json
{ "ticker": "NVDA", "theme": "AI Infrastructure" }
```

### POST `/api/learn-why`

Used for blocked-trade explanation workflows.

## 8) Data/backend assumptions v0 should not break

- Supabase is source of truth for auth and persistence.
- Trade execution route enforces daily limits by safety mode.
- `training_wheels` mode implies paper behavior and stricter daily cap.
- Receipt and scoring payloads are expected in DB writes.

## 9) Build rules for v0 output

1. **Do not replace existing API route paths**; call existing endpoints.
2. **Do not rename core domain types** (`TradeCandidate`, `Theme`, `Portfolio`, etc.).
3. **Prefer incremental component generation** under `components/` and keep App Router layout.
4. **Keep client boundaries explicit** (`"use client"` where hooks/context are used).
5. **Use Tailwind classes only** (no CSS-in-JS framework additions).
6. **Do not introduce new state library** unless explicitly requested.
7. **Keep desktop + mobile both first-class** (not mobile-only).

## 10) Known implementation note (important)

The analyze route currently emits duplicate top-level keys (`analysis`, `consensus`, `modelResults`, `aiConsensus`) with later values derived from `proofBundle` taking precedence in JSON serialization. v0-generated client logic should treat the final returned keys as canonical and avoid assuming both variants are present simultaneously.

## 11) Suggested v0 prompt (copy/paste)

Use this when generating or refactoring UI in v0:

> Build a Next.js 15 App Router UI for a dark, tactical trading dashboard called TradeSwarm. Keep existing route and API contracts. Use Tailwind only. Preserve domain naming: Theme, TradeCandidate, Portfolio, TabId. Implement responsive behavior: desktop 3-pane workspace (section nav, feed explorer, context panel), and mobile tabbed app (Radar/Trades/My Money) with fixed bottom tab bar. Keep neon green accent on black theme, compact density, and monospace ticker labels. Integrate actions to existing endpoints: POST /api/analyze, /api/trade, /api/watchlist, /api/learn-why. Provide states for loading, success, blocked/no-trade, and API failure with reasonCode display. Do not introduce new backend paths.

## 12) Acceptance checklist for “aligned with repo completely”

- [ ] Uses existing folders (`app/`, `components/`, `lib/`) and import aliases (`@/`).
- [ ] Keeps existing tab ids and section names.
- [ ] Uses current color tokens and radius.
- [ ] Calls current API endpoints with matching payload keys.
- [ ] Handles `GO | WAIT | NO` distinctly in UI.
- [ ] Displays trust score + sizing + reason bullets.
- [ ] Supports auth-gated app shell behavior.
- [ ] Works for both desktop multi-pane and mobile tab shell.
- [ ] Avoids introducing incompatible data model names.

## 13) Questions to resolve before final v0 generation

1. Should v0 target **desktop workspace as primary** (current lg+ behavior) or prioritize mobile tab UX first?
2. Do you want v0 to keep using **mock data fallbacks** in UI, or switch fully to API-fed states?
3. Should trade execution remain visibly labeled as **practice/paper only**, or should UI include live-trading toggles now?
4. Do you want v0 to generate only UI components, or also propose fixes for API response consistency in `/api/analyze`?
5. Should receipt UX prioritize the existing drawer, or should v0 redesign it as a dedicated full page on mobile?
6. Any non-negotiable typography/branding constraints beyond current tokens (e.g., logo lockups, icon style, motion limits)?
