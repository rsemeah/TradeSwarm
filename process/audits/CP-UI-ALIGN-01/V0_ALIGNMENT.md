# CP-UI-ALIGN-01: v0.dev Downstream Alignment

## Status
Alignment check between v0.dev artifacts and runtime repo

---

## Route Inventory (Runtime)

| Route | Status | Notes |
|-------|--------|-------|
| `/` | LIVE | Main app shell |
| `/auth/login` | LIVE | Supabase auth |
| `/auth/sign-up` | LIVE | Supabase auth |
| `/auth/sign-up-success` | LIVE | Success confirmation |
| `/auth/error` | LIVE | Error handling |
| `/internal/ops` | LIVE | Ops dashboard |

---

## Screen → v0 Artifact → Runtime Route Mapping

| Screen | v0 Artifact | Runtime Route | Status |
|--------|-------------|---------------|--------|
| Login | v0/auth/login | `/auth/login` | ALIGNED |
| Sign Up | v0/auth/sign-up | `/auth/sign-up` | ALIGNED |
| Dashboard | v0/app.tsx | `/` (app.tsx) | ALIGNED |
| Signals Feed | v0/screens/radar-screen | `/` (radar tab) | ALIGNED |
| Trade Card | v0/trade-card | Component | ALIGNED |
| Receipt Drawer | v0/receipt-drawer | Component | ALIGNED |
| Ops Dashboard | v0/internal/ops | `/internal/ops` | ALIGNED |

---

## Brand Palette Alignment

| Token | v0 Value | Runtime Value | Status |
|-------|----------|---------------|--------|
| background | #0c0c0c | #0c0c0c | ALIGNED |
| foreground | #f5f5f5 | #f5f5f5 | ALIGNED |
| card | #141414 | #141414 | ALIGNED |
| border | #1f1f1f | #1f1f1f | ALIGNED |
| primary | #1a5c3a | #1a5c3a | ALIGNED |
| accent | #c9a227 | #c9a227 | ALIGNED |
| bullish | #22c55e | #22c55e | ALIGNED |
| bearish | #ef4444 | #ef4444 | ALIGNED |

---

## Missing Runtime Routes (Detected in Spec)

These routes are in the nav spec but NOT in the repo:

| Route | Nav Group | Action |
|-------|-----------|--------|
| `/dashboard` | War Room | Wire to `/` |
| `/markets/watchlist` | Markets | Create stub |
| `/markets/options-chain` | Markets | Create stub |
| `/trade/orders` | Trade | Create stub |
| `/trade/positions` | Trade | Create stub |
| `/swarm/consensus` | Swarm | Create stub |
| `/swarm/strategies` | Swarm | Create stub |
| `/truth/receipts` | Truth | Wire to existing API |
| `/truth/replay` | Truth | Wire to existing API |
| `/outcomes/journal` | Outcomes | Wire to existing API |
| `/outcomes/analytics` | Outcomes | Create stub |
| `/ops/health` | Ops | Wire to existing API |
| `/account/settings` | Account | Create stub |

---

## v0.dev Downstream Prompt

When updating v0.dev, use this prompt:

```text
You are updating a v0.dev UI to match an existing Next.js App Router repo.

Constraints:
- Do NOT invent routes. Only use these routes:
  - / (main app)
  - /auth/login
  - /auth/sign-up
  - /auth/sign-up-success
  - /auth/error
  - /internal/ops

- UI must match the repo's wired screens and naming.

- Apply this brand palette (Gemini-derived) as tokens:
  --background: #0c0c0c
  --foreground: #f5f5f5
  --card: #141414
  --border: #1f1f1f
  --primary: #1a5c3a
  --accent: #c9a227
  --bullish: #22c55e
  --bearish: #ef4444
  --muted-foreground: #737373

Tasks:
1) Update global styles/theme to use the provided tokens (no random hex).
2) Update navigation to show 8 groups: War Room, Markets, Trade, Swarm, Truth, Outcomes, Ops, Account
3) Ensure trade cards show GO/WAIT/NO badges with correct colors
4) Ensure components reflect the TradeSwarm brand (gold accent, forest green primary)

Deliverables:
- Updated v0 components for each screen
- Consistent use of CSS variables
```

---

## Next Steps

1. **Fix current build errors** - TypeScript/build failures blocking PR merge
2. **Run route alignment** - Create stub routes for missing pages
3. **Final palette audit** - Ensure no hardcoded hex in components
4. **v0.dev update** - Push aligned components to v0.dev
