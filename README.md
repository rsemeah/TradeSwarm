# TradeSwarm

TradeSwarm is a regime-aware options engine built to maximize compounded bankroll growth. Powered by TruthCal™, it evaluates probability, liquidity, expected log return, and drawdown impact before allocating capital using capped fractional Kelly sizing.

## Current Status (Implemented)

The following enterprise/governance scaffolding is present in this repository:

- CI workflow: `.github/workflows/ci.yml`
- CodeQL workflow: `.github/workflows/codeql.yml`
- Dependabot config: `.github/dependabot.yml`
- Branch protection checklist: `.github/branch-protection-checklist.md`
- License: `LICENSE`

Runtime/engine scaffolding currently present:

- TruthSerum adapter: `lib/adapters/truthserum.ts`
- Engine config thresholds: `lib/config/engine.ts`
- Safety evaluator: `lib/engine/safety.ts`
- Yahoo market-data helper: `lib/market-data/yahoo.ts`
- Canonical proof bundle types: `lib/types/proof-bundle.ts`
- Enterprise integration decisions doc: `docs/enterprise-integration-decisions.md`
- Receipt schema migration: `scripts/012_enterprise_receipt_schema.sql`

## Current Limits

- Main trading routes remain focused on the V1 flow in `app/api/trade/*` and are not yet fully wired to TruthSerum scoring + safety verdict persistence end-to-end.
- Multi-model analysis is conditional: Groq is primary; OpenAI consensus path requires `AI_GATEWAY_API_KEY` or `OPENAI_API_KEY`.
- Branch protection rules are documented but must still be enforced in GitHub repository settings.

## Governance Baseline

This repository includes CI/security workflows for pull requests into `main`, plus a branch-protection checklist for review and status-check enforcement before merge.

## License

This project is source-available with **all rights reserved**. See [`LICENSE`](./LICENSE).
