# CP-UI-ALIGN-01: Build Reality Inventory

## Routes Map

### Pages (app/**/page.tsx)
| Route | File | Status |
|-------|------|--------|
| `/` | `app/page.tsx` | WIRED - Main app shell |
| `/auth/login` | `app/auth/login/page.tsx` | WIRED |
| `/auth/sign-up` | `app/auth/sign-up/page.tsx` | WIRED |
| `/auth/sign-up-success` | `app/auth/sign-up-success/page.tsx` | WIRED |
| `/auth/error` | `app/auth/error/page.tsx` | WIRED |
| `/internal/ops` | `app/internal/ops/page.tsx` | WIRED - Ops dashboard |

### API Routes (app/api/**/route.ts)
| Route | File | UI Caller | Status |
|-------|------|-----------|--------|
| `/api/scan` | `app/api/scan/route.ts` | radar-screen.tsx | WIRED |
| `/api/scan/[scanId]` | `app/api/scan/[scanId]/route.ts` | None | UNWIRED |
| `/api/trade` | `app/api/trade/route.ts` | None | UNWIRED |
| `/api/trade/execute` | `app/api/trade/execute/route.ts` | sniper-overlay.tsx | WIRED |
| `/api/trade/preview` | `app/api/trade/preview/route.ts` | None | UNWIRED |
| `/api/trade/simulate` | `app/api/trade/simulate/route.ts` | None | UNWIRED |
| `/api/analyze` | `app/api/analyze/route.ts` | None | UNWIRED |
| `/api/watchlist` | `app/api/watchlist/route.ts` | None | UNWIRED |
| `/api/journal/entry` | `app/api/journal/entry/route.ts` | None | UNWIRED |
| `/api/journal/close` | `app/api/journal/close/route.ts` | None | UNWIRED |
| `/api/journal/performance` | `app/api/journal/performance/route.ts` | None | UNWIRED |
| `/api/learn-why` | `app/api/learn-why/route.ts` | learn-why-modal.tsx | WIRED |
| `/api/health` | `app/api/health/route.ts` | None | UNWIRED |
| `/api/health/engine` | `app/api/health/engine/route.ts` | None | UNWIRED |
| `/api/internal/ops/calibration-metrics` | route.ts | ops/page.tsx | WIRED |
| `/api/internal/ops/replay/[id]` | route.ts | None | UNWIRED |
| `/api/internal/ops/validation-report` | route.ts | ops/page.tsx | WIRED |
| `/api/internal/jobs/outcome-tracker` | route.ts | Cron | N/A |
| `/api/internal/jobs/recalibrate` | route.ts | Cron | N/A |

## Screen Map (vs Nav Spec)

| Screen | Nav Group | Status | Component/Route |
|--------|-----------|--------|-----------------|
| Dashboard | War Room | PARTIAL | `app/page.tsx` → `components/app.tsx` |
| Signals Feed | War Room | PARTIAL | `components/screens/radar-screen.tsx` |
| Risk Governor | War Room | MISSING | - |
| Watchlists | Markets | PARTIAL | API exists, no UI |
| Quotes & Ticker | Markets | MISSING | - |
| Charts | Markets | MISSING | - |
| Options Chain | Markets | PARTIAL | `src/lib/adapters/optionsChain/` (backend only) |
| Trade Ticket | Trade | PARTIAL | `components/sniper-overlay.tsx` |
| Orders | Trade | MISSING | - |
| Positions | Trade | MISSING | - |
| Activity | Trade | MISSING | - |
| Consensus View | Swarm | PARTIAL | `components/trade-card.tsx` (GO/WAIT/NO) |
| Strategy Library | Swarm | MISSING | - |
| Strategy Detail | Swarm | MISSING | - |
| Capital Policy | Swarm | MISSING | - |
| Receipts Ledger | Truth | PARTIAL | API exists, no list UI |
| Receipt Detail | Truth | DONE | `components/receipt-drawer.tsx` |
| Replay Center | Truth | PARTIAL | `lib/engine/replayTrade.ts` (backend only) |
| Convergence Dashboard | Truth | MISSING | - |
| Trade Journal | Outcomes | PARTIAL | API exists, no UI |
| Performance Analytics | Outcomes | MISSING | - |
| Experiments | Outcomes | MISSING | - |
| System Health | Ops | DONE | `app/api/health/engine/route.ts` |
| Broker Connections | Ops | MISSING | - |
| Paper→Live Toggle | Ops | PARTIAL | Config only, no UI |
| Alerts Center | Ops | MISSING | - |
| Plan & Billing | Account | MISSING | - |
| Security | Account | MISSING | - |
| Notifications | Account | MISSING | - |
| Bug/Feedback | Account | MISSING | - |

## Components Existing but Not Imported

| Component | File | Imported By | Status |
|-----------|------|-------------|--------|
| DealCard | `components/DealCard.tsx` | None | ORPHAN |
| DealList | `components/DealList.tsx` | None | ORPHAN |
| ProofDrawer | `components/ProofDrawer.tsx` | None | ORPHAN (duplicate of receipt-drawer?) |
| ScanControls | `components/ScanControls.tsx` | None | ORPHAN |
| theme-card | `components/theme-card.tsx` | app.tsx | WIRED |

## Empty Folders / Placeholder Routes
- None detected

## DB Tables vs Migrations

| Table | Script | Migration | Status |
|-------|--------|-----------|--------|
| profiles | scripts/001_*.sql | - | EXISTS |
| trades | scripts/004_create_trades.sql | - | EXISTS |
| trades_v2 | scripts/007_create_trades_v2.sql | 20260228_trades_v2.sql | EXISTS |
| trade_receipts | scripts/008_*.sql, 012_*.sql | 20260227_receipts.sql | EXISTS |
| engine_events | scripts/003_engine_events.sql | 20260227_receipts.sql | EXISTS |
| watchlist | scripts/005_create_watchlist.sql | - | EXISTS |
| portfolio_stats | scripts/006_create_portfolio_stats.sql | - | EXISTS |
| calibration_governance | scripts/012_create_calibration_governance.sql | - | EXISTS |
| learn_why_cache | scripts/009_create_learn_why_cache.sql | - | EXISTS |
| preferences | scripts/003_create_preferences.sql | - | EXISTS |

## Env Var Usage Map

| Variable | Used In | Required |
|----------|---------|----------|
| NEXT_PUBLIC_SUPABASE_URL | lib/supabase/*.ts | YES |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | lib/supabase/*.ts | YES |
| SUPABASE_SERVICE_ROLE_KEY | lib/supabase/admin.ts | YES (server) |
| GROQ_API_KEY | AI routes | YES |
| OPENAI_API_KEY | Codex workflow | YES (CI) |

## Summary

| Category | Count |
|----------|-------|
| **Pages** | 6 |
| **API Routes** | 19 |
| **API Routes Wired** | 6 |
| **API Routes Unwired** | 11 |
| **Screens Implemented** | 2 |
| **Screens Partial** | 8 |
| **Screens Missing** | 18 |
| **Orphan Components** | 4 |
