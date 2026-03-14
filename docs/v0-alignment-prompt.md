# TradeSwarm v0.dev Alignment Prompt

> This document is the **authoritative source of truth** for UI and API alignment.
> All v0.dev and Codex agents MUST reference this document before making changes.

---

## Locked Contracts

### A) Engine Heartbeat Endpoint

**Endpoint:** `GET /api/health/engine`

**Contract Response:**
```json
{
  "ok": boolean,
  "service": "engine",
  "ts": string (ISO 8601)
}
```

**Extended Response (optional fields):**
```json
{
  "ok": boolean,
  "service": "engine",
  "ts": string,
  "status": "operational" | "degraded" | "error",
  "engineVersion": string,
  "checks": { ... },
  "metrics": { ... }
}
```

**Rules:**
- MUST always return `ok`, `service`, and `ts` at minimum
- Do not couple UI to engine internals without explicit task approval
- Circuit breaker status may be included but is informational only

---

### B) Receipt Drawer Component

**File:** `components/receipt-drawer.tsx`

**Baseline Props (MUST support):**
```typescript
interface ReceiptDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children?: React.ReactNode
}
```

**Extended Props (currently implemented):**
```typescript
interface ReceiptDrawerProps {
  isOpen: boolean       // DEPRECATED: use `open`
  onClose: () => void   // DEPRECATED: use `onOpenChange`
  receipt: ReceiptData | null
}
```

**Migration Path:**
- Support both prop signatures during transition
- New code should use `open` / `onOpenChange`
- Legacy `isOpen` / `onClose` will be removed in v2

---

### C) Determinism / Replay Spine

**Rules:**
1. All hashing MUST use `stableStringify()` from `lib/engine/determinism.ts`
2. Ignore volatile fields when computing hashes: `timestamp`, `created_at`, `updated_at`
3. Replay MUST refuse mismatched schema versions
4. Never introduce `Math.random()` or `Date.now()` in engine paths without seeding

**Determinism Context (required fields):**
```typescript
interface DeterminismContext {
  market_snapshot_ref: string | null
  market_snapshot_hash: string
  engine_version: string
  config_hash: string
  determinism_hash: string
  random_seed: number | null
}
```

---

## Build Gates (MUST PASS)

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
```

---

## Design Tokens

### Colors
```css
--background: #0a0a0a       /* Near-black */
--foreground: #ffffff       /* White */
--card: #141414             /* Card backgrounds */
--border: #1f1f1f           /* Borders */
--muted: #141414            /* Muted backgrounds */
--muted-foreground: #6b6b6b /* Muted text */
--accent: #00ff88           /* Neon green (GO) */
--warning: #ffcc00          /* Gold (WAIT) */
--danger: #ff4444           /* Red (NO) */
```

### Brand Colors
```css
--brand-gold: #C5A028       /* TRADE */
--brand-green: #1B5E20      /* SWARM */
```

---

## Copy Conventions

| Element | Format | Example |
|---------|--------|---------|
| Headers | ALL CAPS | `REGIME ANALYSIS` |
| Tickers | UPPERCASE | `NVDA`, `SPY` |
| Currency | `$X,XXX.XX` | `$1,234.56` |
| Percentages | `X.X%` | `12.5%` |
| R-Multiples | `XR` | `2.5R` |
| Timestamps | Relative preferred | `2m ago`, `Just now` |

---

## UI State Requirements

Every screen/component MUST handle:
1. **Loading** - Skeleton or spinner
2. **Empty** - Helpful message, not blank
3. **Error** - User-friendly message + retry option
4. **Stale** - Indicator if data is outdated (>5 min)

---

## Motion Guidelines

- **No external animation libraries** (no Framer Motion, no GSAP)
- Use CSS transitions only:
  - `transition-all duration-200`
  - `transition-colors duration-150`
- Allowed keyframe animations (defined in globals.css):
  - `spin` - Loading spinners
  - `pulse-glow` - Active state indicators
  - `slideUp` / `slideDown` - Drawer/sheet animations

---

## File Ownership

| Path | Owner | Change Policy |
|------|-------|---------------|
| `lib/engine/*` | Engine team | Requires explicit task |
| `lib/types/proof-bundle.ts` | Schema owner | Breaking changes need migration |
| `app/api/health/engine/route.ts` | Infra | Locked contract |
| `components/receipt-drawer.tsx` | UI team | Composition surface only |
| `docs/v0-alignment-prompt.md` | This file | Append-only, no deletions |

---

## API Response Shapes (Stable)

### Health Check
```typescript
// GET /api/health/engine
{ ok: boolean, service: "engine", ts: string }
```

### Scan Result
```typescript
// POST /api/scan
{ 
  scan_id: string,
  candidates: CandidateProofBundle[],
  cached: boolean,
  scanned_at: string
}
```

### Trade Preview
```typescript
// POST /api/trade/preview
{
  allowed: boolean,
  reason_code: string,
  proof_bundle: CanonicalProofBundle
}
```

---

## Forbidden Patterns

1. **No speculation** - If not in repo, mark as MISSING
2. **No invented types** - Use existing schemas
3. **No nondeterminism** - No unseeded random in engine paths
4. **No external deps** - Without explicit approval
5. **No Tailwind plugins** - Until infra PR restores pipeline

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-01 | Initial alignment document |
