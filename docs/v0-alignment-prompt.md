# TradeSwarm Unified Alignment Prompt (v0.dev + Codex)

Use this prompt as the single operating contract for **v0.dev (UI)** and **Codex/Claude Code (repo engineering)** workstreams in this repository.

```text
You are working inside the TradeSwarm repo (Next.js App Router, TypeScript strict, pnpm).
Your job is to ship changes that compile, typecheck, and build cleanly.

TRUTH RULES (NON-NEGOTIABLE)
1) No speculation. If you cannot verify in repo/code, say: MISSING (no evidence found).
2) Every claim about existing code must include file path + function/component name.
3) Do not invent APIs, env vars, DB tables, or types. If not present, mark as MISSING and propose the smallest addition.
4) Preserve determinism: never introduce nondeterministic behavior in engine paths.

SEARCH PROOF RULE (REQUIRED)
- If you cannot find `docs/v0-alignment-prompt.md` or any referenced types/routes, you MUST stop and report MISSING with the exact repo search terms used.
- Include the search proof block in your response:
  - Commands run (e.g., `rg -n "term" path`)
  - Results found (or explicit "no matches")

BUILD GATES (MUST PASS)
- pnpm install --frozen-lockfile
- pnpm lint
- pnpm typecheck
- pnpm build

STABILIZED CONSTRAINTS (CURRENT BRANCH REALITY)
- Tailwind/PostCSS transforms are intentionally disabled for stability in this branch.
- Styling must use existing CSS tokens / plain CSS until Tailwind pipeline is intentionally restored in a dedicated infra PR.
- Do not reintroduce Tailwind `@tailwind` directives or tailwind PostCSS plugins on this branch.

LOCKED CONTRACTS (DO NOT BREAK)
A) Engine heartbeat endpoint (baseline contract)
- GET /api/health/engine
- Response JSON MUST be:
  { ok: boolean, service: "engine", ts: string }
- This is a heartbeat. Do not couple UI to engine internals until explicitly asked.

B) Receipt drawer contract (baseline composition surface)
- `components/receipt-drawer.tsx` is a minimal client component with:
  props: { open: boolean, onOpenChange: (open:boolean)=>void, children?: ReactNode }
- v0 should treat it as a shell and compose content inside; do not depend on unstable proof bundle schemas in this patch.

C) Determinism / Replay spine (do not regress)
- Any hashing/canonicalization must be stable and ignore volatile timestamp-like fields.
- Replay must refuse mismatched input schema versions where applicable.

WHAT IS ALLOWED TO CHANGE
- Add new components/screens requested by the task.
- Add small helper utilities for formatting, mapping, and API typing.
- Add new route handlers ONLY if specified by the task and with stable JSON contracts.
- Add docs that explain contracts and usage.

WHAT IS NOT ALLOWED TO CHANGE (WITHOUT EXPLICIT TASK INSTRUCTIONS)
- `app/api/health/engine/route.ts` response shape.
- `components/receipt-drawer.tsx` public API surface.
- The current “Tailwind disabled” constraint on build pipeline.
- Core engine logic (`lib/engine/*`) unless the task explicitly targets it.

INPUTS YOU MUST USE (SOURCE OF TRUTH)
- `docs/v0-alignment-prompt.md` (authoritative UI+API alignment).
- Existing repo files + types (no invented schemas).
- This message’s locked contracts + constraints.

DELIVERABLE FORMAT (MANDATORY)
For EVERY task response, output in this structure:

1) Scope & Intent (3-6 bullets)
- What you are building and why (in repo terms)

2) Files Touched (table)
- Path | Change summary | Risk level (low/med/high)

3) Implementation (copy/paste ready)
- If Codex: provide actual code patches per file (or unified diff)
- If v0: provide React component(s) with explicit props and data contract; do not assume Tailwind utilities work; use tokens / classNames that exist

4) Verification Commands (copy/paste)
- pnpm lint
- pnpm typecheck
- pnpm build
- plus any route curl tests if you added/changed an API

5) Contract Notes (short)
- Any new props, new API response shapes, or state handling rules

UI BEHAVIORAL REQUIREMENTS (APPLIES TO v0 + Codex)
- Every screen must have: loading / empty / error / stale states.
- Copy conventions: all-caps headers, tickers uppercase, currency formatting, R-multiples formatting.
- Motion: no external libs; only simple CSS transitions as specified in this file.

DEFAULT ASSUMPTIONS (ONLY IF NOT SPECIFIED)
- Auth-required endpoints remain auth-required.
- Public endpoints remain public.
- Do not add new dependencies unless absolutely required and approved by the task.

NOW DO THIS TASK:
<PASTE ONE TASK SPEC HERE — e.g., “Build Trade Journal Screen” or “Build Calibration Transparency Card”>
```

## Fast usage

### For v0.dev
1) Paste the unified prompt.
2) Replace the final task line with a UI task.
3) Ensure output includes explicit loading/empty/error/stale states and uses existing tokens/classes.

### For Codex / Claude Code
1) Paste the same prompt.
2) Replace the final task line with an engineering task.
3) Return repo-ready patches plus verification commands.
