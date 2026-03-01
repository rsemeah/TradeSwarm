# TruthSerum Audit

## CP2 artifacts
- Replay fixture runner: `scripts/replay-fixtures.mjs`
- CP2 artifact validator: `scripts/check-cp2.mjs`
- Replay convergence SQL view: `supabase/migrations/20260301_cp2_replay_convergence_metrics.sql`
- Convergence metrics endpoint: `GET /api/internal/ops/convergence`
- Convergence definition: `docs/06_convergence_definition.md`

## Runbook
1. Start app and database services.
2. Execute fixture replay batch:
   ```bash
   pnpm replay:fixtures --count 50 --mode simulate --ticker SPY --amount 200
   ```
3. Validate produced artifact:
   ```bash
   pnpm check:cp2 artifacts/replay-fixtures.<timestamp>.json
   ```
4. Query convergence endpoint:
   ```bash
   curl -s http://localhost:3000/api/internal/ops/convergence | jq
   ```

## Expected outputs
- Runner prints one-line summary:
  `CP2 matchRate=0.9800 (49/50) out=/.../artifacts/replay-fixtures.<timestamp>.json`
- Metrics endpoint returns stable schema:
  ```json
  {
    "ok": true,
    "total": 50,
    "matches": 49,
    "matchRate": 0.98,
    "mismatchesByClassification": {
      "data_mismatch": 1
    },
    "lastRunAtUtc": "2026-03-01T00:00:00.000Z"
  }
  ```

## Verification status in restricted environments
- Runtime verification requiring local auth/session + live endpoints is **UNVERIFIED** when the environment cannot run Next.js (for example SWC download/network restriction).
- Static checks (`pnpm lint`, `pnpm typecheck`) remain required and were run.
