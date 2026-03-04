# CP-UI-ALIGN-01: Convergent Backlog

## Priority: Wire Existing > Build New

---

## Phase 1: Build Stabilization (BLOCKING)

### Task 1: Fix TypeScript Build Errors
**Files:** `components/app.tsx`, `components/receipt-drawer.tsx`
**CI Checks:** `pnpm typecheck`, `pnpm build`
**Acceptance:** `pnpm build` succeeds
**No new architecture**

### Task 2: Align Types with Components
**Files:** `lib/types.ts`, `lib/types/proof.ts`, `lib/types/proof-bundle.ts`
**CI Checks:** `pnpm typecheck`
**Acceptance:** All type imports resolve correctly
**No new architecture**

---

## Phase 2: Wire Existing APIs to UI

### Task 3: Wire Watchlist API
**Files:** `components/screens/radar-screen.tsx` (add watchlist display)
**API:** `/api/watchlist` (already exists)
**Acceptance:** User can view/manage watchlist from radar screen
**No new architecture**

### Task 4: Wire Trade Preview API
**Files:** `components/sniper-overlay.tsx` (add preview step)
**API:** `/api/trade/preview` (already exists)
**Acceptance:** Preview shows before execute
**No new architecture**

### Task 5: Wire Trade Simulate API
**Files:** `components/sniper-overlay.tsx` (add simulate button)
**API:** `/api/trade/simulate` (already exists)
**Acceptance:** "Simulate First" button works
**No new architecture**

### Task 6: Wire Journal APIs
**Files:** `components/screens/money-screen.tsx` (add journal view)
**APIs:** `/api/journal/entry`, `/api/journal/close`, `/api/journal/performance`
**Acceptance:** Journal entries visible in Money screen
**No new architecture**

### Task 7: Wire Health API to Ops
**Files:** `app/internal/ops/page.tsx`
**API:** `/api/health/engine` (already exists)
**Acceptance:** System health visible on ops page
**No new architecture**

---

## Phase 3: Route Structure Alignment

### Task 8: Add Dashboard Route
**Files:** `app/dashboard/page.tsx` (new, redirects or renders app.tsx)
**CI Checks:** Build
**Acceptance:** `/dashboard` route works
**No new architecture** - just route wiring

### Task 9: Add Truth Routes
**Files:** 
- `app/truth/receipts/page.tsx` (list)
- `app/truth/receipts/[id]/page.tsx` (detail)
**APIs:** Existing replay APIs
**Acceptance:** Truth section reachable via nav
**No new architecture**

### Task 10: Add Trade Routes
**Files:**
- `app/trade/orders/page.tsx`
- `app/trade/positions/page.tsx`
**Acceptance:** Trade section structure in place (can be stubs initially)
**No new architecture**

---

## Phase 4: Orphan Component Cleanup

### Task 11: Evaluate Orphan Components
**Files:** `DealCard.tsx`, `DealList.tsx`, `ProofDrawer.tsx`, `ScanControls.tsx`
**Action:** Either wire into UI or remove
**Acceptance:** No orphan components remain
**No new architecture**

---

## Phase 5: Navigation Implementation

### Task 12: Implement 8-Group Sidebar Nav
**Files:** `components/app.tsx` (update nav structure)
**Reference:** Nav spec from screenshots
**Acceptance:** All 8 groups visible, routes linked
**No new architecture** - uses existing components

---

## Phase 6: Brand Token Lock

### Task 13: Finalize Palette Tokens
**Files:** `app/globals.css`, `process/brand/PALETTE.md`, `process/brand/TOKENS.md`
**Acceptance:** All colors use CSS variables, no hardcoded hex in new code
**No new architecture**

---

## Phase 7: v0.dev Alignment

### Task 14: Create V0 Alignment Doc
**Files:** `process/audits/CP-UI-ALIGN-01/V0_ALIGNMENT.md`
**Action:** Map screens to v0 artifacts
**Acceptance:** Clear alignment between runtime and v0.dev
**No new architecture**

---

## Task Summary

| Phase | Tasks | Priority |
|-------|-------|----------|
| Build Stabilization | 1-2 | BLOCKING |
| Wire Existing APIs | 3-7 | HIGH |
| Route Alignment | 8-10 | MEDIUM |
| Orphan Cleanup | 11 | LOW |
| Navigation | 12 | HIGH |
| Brand Tokens | 13 | MEDIUM |
| v0 Alignment | 14 | LOW |

**Total Tasks:** 14
**Blocking:** 2
**High Priority:** 7
**Medium Priority:** 3
**Low Priority:** 2
