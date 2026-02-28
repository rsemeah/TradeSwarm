# RedLantern Repository Marshal Policy

This policy is the default operating contract for Codex and maintainers in this repository.

## Priorities
1. **P0 (merge blocking):** safety wiring missing in trade routes.
2. **P0 (merge blocking):** determinism hash referenced but not computed/persisted.
3. **P0 (merge blocking):** missing imports, unresolved modules, or build-breaking gaps.
4. **P1:** README claims files/workflows that do not exist.

## Working Rules
- Determinism-first: prefer stable, replayable outputs over cleverness.
- Safety is law: do not bypass, stub out, or skip safety gates silently.
- Replayable receipts: when receipts mention determinism, include persisted hash data.
- Minimal PR noise: prefer the smallest safe diff that resolves the issue.
- Linear history preferred: use rebase-style workflows where possible.
- Do not bypass failing CI, required checks, or branch protections.

## Required checks before recommending merge
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

If checks fail due to missing modules, add deterministic type-safe stubs instead of broad refactors.

## Dependabot policy
- Dependency-only PRs with green CI are recommended for auto-merge (squash).
- Security updates are prioritized.
