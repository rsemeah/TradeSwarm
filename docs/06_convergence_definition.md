# 06 — Convergence Definition (CP2)

## CP1 vs CP2
- **CP1 (determinism replay):** verifies one stored trade can be replayed with matching deterministic outputs (`/api/internal/ops/replay/:id`, `trade_replay_reports`).
- **CP2 (stability under repetition):** repeats deterministic generation + replay over a fixed fixture series and measures aggregate convergence (`scripts/replay-fixtures.mjs` + `replay_convergence_metrics` + `/api/internal/ops/convergence`).

## CP2 formula
For the most recent replay window (`LIMIT 1000` in `replay_convergence_metrics`):

- `total = count(trade_replay_reports)`
- `matches = count(match = true)`
- `matchRate = matches / total` when `total > 0`, else `0`
- `mismatchesByClassification = json object keyed by mismatch_classification`
- `lastRunAtUtc = max(created_at)`

Primary data source: `trade_replay_reports` via view `replay_convergence_metrics`.

## Mismatch classification
- `none`: replay exactly matched persisted decision/hash checks.
- `data_mismatch`: determinism hash diverged.
- `nondeterministic_logic`: decision fields diverged without version drift.
- `version_drift`: persisted engine version differs from replay engine version.

## Operating procedure
1. Run fixture replay generation:
   ```bash
   pnpm replay:fixtures --count 50 --mode simulate --ticker SPY --amount 200
   ```
2. Validate artifact shape and schema guard:
   ```bash
   pnpm check:cp2 artifacts/replay-fixtures.<timestamp>.json
   ```
3. Read aggregate metrics:
   ```bash
   curl -s http://localhost:3000/api/internal/ops/convergence | jq
   ```

## Regression threshold
- **Fail CP2** when `matchRate < 0.98` over the active run window.
- **Fail CP2** when runner exits non-zero due to schema mismatch (`SCHEMA_VERSION_MISMATCH`).

## Determinism constraints
- Replay fixture keys are deterministic: `cp2-<index>-<bucket>`.
- No random sampling is used in CP2 fixture generation.
- Determinism hashes use stable JSON canonicalization (`lib/engine/determinism.ts`) and explicitly normalize unsupported numeric values.

## Environment note
`pnpm build` / `pnpm dev` can fail in restricted environments when SWC binary download is blocked by network policy. Treat this as environment limitation, not convergence logic failure.
