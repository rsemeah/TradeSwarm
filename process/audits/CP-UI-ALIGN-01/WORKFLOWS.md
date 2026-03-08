# CP-UI-ALIGN-01: Workflow & Enforcement Audit

## Workflows Found

### 1. `.github/workflows/ci.yml`

| Field | Value |
|-------|-------|
| **Triggers** | `pull_request` to main, `push` to main |
| **Jobs** | `build-and-typecheck` |
| **Steps** | checkout → pnpm setup → node setup → install → lint → typecheck → build |
| **Required Secrets** | None |
| **Timeout** | 20 minutes |
| **Concurrency** | Cancels in-progress runs for same ref |

**What it blocks:** PRs cannot merge if:
- `pnpm lint` fails (runs `scripts/governance-lint.mjs`)
- `pnpm typecheck` fails (runs `tsc --noEmit`)
- `pnpm build` fails (runs `next build`)

### 2. `.github/workflows/codex-policy.yml`

| Field | Value |
|-------|-------|
| **Triggers** | `pull_request` (opened, synchronize, reopened, ready_for_review), `workflow_dispatch` |
| **Jobs** | `codex-policy` |
| **Steps** | checkout → Codex policy review |
| **Required Secrets** | `OPENAI_API_KEY` |
| **Condition** | Skips draft PRs |

**What it blocks:** Requires OpenAI Codex review via `.github/codex/policy-prompt.md`

## Governance Lint Checks (`scripts/governance-lint.mjs`)

| Check | Rule | Failure Mode |
|-------|------|--------------|
| No Math.random | `rg 'Math\.random\(' lib app src` must be empty | Fails if any match found |
| Determinism hash wiring | `rg 'determinism_hash\|determinismHash' lib app` must have matches | Fails if NO matches found |

## Why Current PRs Fail

### Root Cause Analysis

1. **Build Failure (Primary)**
   - TypeScript errors in components (e.g., `receipt-drawer.tsx` accessing non-existent properties)
   - JSX syntax errors (unclosed tags, missing brackets)
   - Type mismatches between components and type definitions

2. **Governance Lint Failure (Secondary)**
   - If `determinism_hash` references are removed or broken, lint fails
   - Currently passing: 7 references exist in `lib/` directory

3. **Codex Policy (Tertiary)**
   - Requires `OPENAI_API_KEY` secret
   - May fail if policy prompt criteria not met

## Required Checks for Merge

| Check | Required | Status |
|-------|----------|--------|
| CI / build-and-typecheck | YES | FAILING (build errors) |
| Codex Policy | YES (if configured) | Unknown (secret required) |
| Vercel Preview | Auto | Depends on build |

## Fixes to Unblock PRs

### Immediate (Build)
1. Fix all TypeScript errors in components
2. Ensure JSX is valid (all tags closed)
3. Ensure types match actual data structures

### Governance (Already Passing)
- `determinism_hash` references exist in:
  - `lib/types/proof-bundle.ts`
  - `lib/engine/runCanonicalTrade.ts`
  - `lib/engine/replayTrade.ts`

### Codex Policy
- Ensure `OPENAI_API_KEY` secret is set in repo settings
- Or disable workflow if not using Codex review
