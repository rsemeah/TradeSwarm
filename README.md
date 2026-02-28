# TradeSwarm

TradeSwarm is a Next.js + Supabase trading decision platform. It evaluates trade candidates, runs safety checks, and records receipts that include model context and deterministic replay metadata.

## Build Status (truthful)

Current codebase status:

- ✅ API routes exist for analysis, trade (`preview`/`simulate`/`execute`), scan, health, and watchlist under `app/api/*`.
- ✅ Scanner foundation exists in `src/lib/scanner/*` and is exposed at `POST /api/scan`.
- ✅ Canonical proof-bundle typings exist in `lib/types/proof-bundle.ts`.
- ✅ Deterministic replay SQL scaffolding exists in `scripts/014_deterministic_replay.sql`.
- ✅ CI and Dependabot configs exist in `.github/workflows/ci.yml` and `.github/dependabot.yml`.
- ⚠️ The repository currently mixes `lib/*` and `src/lib/*` module locations; some flows are still in transition.

## Current State

- Core trade orchestration entrypoint: `lib/engine/runCanonicalTrade.ts`.
- Safety evaluator: `lib/engine/safety.ts`.
- Scan route and scan cache behavior: `app/api/scan/route.ts`.
- Enterprise integration notes: `docs/enterprise-integration-decisions.md`.
- SQL migrations live in `scripts/*.sql`.

## Architecture Map

```text
app/
  api/
    analyze/
    health/
    learn-why/
    scan/
    trade/
    watchlist/
lib/
  engine/
  market-data/
  scanner/
  types/
src/lib/
  scanner/
  news/
  adapters/
  receipts/
scripts/
  *.sql
.github/
  workflows/
  dependabot.yml
```

## Running Locally

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure environment variables in `.env.local` (Supabase and model provider keys).

3. Run development server:

   ```bash
   pnpm dev
   ```

4. Quality checks:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm build
   ```

## Safety + Paper Mode

TradeSwarm includes a safety evaluator (`lib/engine/safety.ts`) and route-level preview/simulate flows. Keep execution in paper/simulated mode until your deployment-level controls, broker integration, and governance checks are fully validated.

## Migration Notes

- SQL migrations are versioned in `scripts/`.
- Existing environments should apply new files in numerical order used by your migration tooling.
- `scripts/014_deterministic_replay.sql` adds replay-oriented snapshot/report tables.

## Roadmap (non-committal)

- **Near term:** unify `lib` vs `src/lib` ownership, complete deterministic receipt writes on all paths.
- **Mid term:** expand scanner persistence and richer regime/news signals.
- **Long term:** production hardening for audit/reporting, reliability, and operator tooling.

## License

All rights reserved. See `LICENSE`.
