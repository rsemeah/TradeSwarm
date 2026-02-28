# TradeSwarm Gap Audit (Generated)

## Phase 1 — Gap Detection

### A) Trade Route Duplication
- `/api/trade/route.ts` performs direct trade/receipt persistence and safety checks independently.
- `/api/trade/preview/route.ts`, `/api/trade/simulate/route.ts`, and `/api/trade/execute/route.ts` each implement separate auth, portfolio lookup, safety-mode logic, and response contracts.
- Existing route files contain overlapping and partially merged logic blocks (duplicate request parsing, duplicate return payload patterns), creating multiple non-canonical persistence paths.
- Proof bundle contract differs by endpoint:
  - `/api/trade/preview` previously returned `proofBundle` from orchestrator plus route-local `preview` shape.
  - `/api/trade/simulate` and `/api/trade/execute` mixed route-built receipt payloads with orchestrator-built bundle.
  - `/api/trade` accepted arbitrary `trade` object and persisted without canonical proof bundle.

### B) Receipt Inconsistency
- `lib/types/proof-bundle.ts` defined envelope-centric schema (`envelope`, `market_context`, `model_versions`, etc.) while `lib/types/proof.ts` defined another canonical engine proof shape (`finalDecision`, `preflight`, `events`, etc.), causing dual contracts.
- SQL schemas diverge:
  - `scripts/008_create_trade_receipts.sql` defines legacy consensus/gate columns.
  - `scripts/012_canonical_trade_receipts.sql` introduces many canonical JSON columns.
  - `scripts/012_canonical_proof_bundle.sql` hard-cuts to `proof_bundle JSONB` plus indexed derived columns.
- `components/receipt-drawer.tsx` expects `ProofBundle` from `lib/types/proof.ts` and UI fields like `finalDecision`, `events`, `preflight`, while SQL enterprise schema additionally expects envelope/provenance-oriented fields.
- Required/optional drift:
  - UI expects core decision fields effectively required.
  - SQL allows many nullable JSONB fields.
  - No single required field set is enforced at type + DB + UI boundaries.
- Versioning gaps:
  - `proof_bundle_version` exists in DB but type versions are fragmented (`v1`, int `schema_version`, text `schema_version`, and no strict bundle evolution policy).

### C) Model Governance Incompleteness
- Model provider/version not consistently persisted in all paths (sometimes in `model_versions`, sometimes inferred from deliberation outputs, sometimes absent).
- Confidence calibration data is collected in `model_calibration_datasets`, but threshold policy feedback into execution safety is not implemented.
- Recalibration job computes model weights but did not previously compute and persist threshold-tightening suggestions by drift bucket.
- No explicit persisted linkage between calibration drift and runtime decision threshold updates.

### D) Safety Enforcement Gaps
- Safety enforcement varied by route:
  - some routes persisted directly without pre-persistence canonical safety check;
  - execute route had daily limit but also had parallel insertion paths.
- Regime/risk/threshold checks were partly in orchestrator preflight and partly in route-level checks.
- Enforcement ordering was inconsistent: persistence could occur via non-canonical route code paths.

### E) Deterministic Replay
- Proof bundle persistence was inconsistent across routes.
- Not all paths stored explicit `input_snapshot`, `market_snapshot`, normalized model payload, and safety decision in a single deterministic receipt contract.
- No dedicated replay function/route existed to reconstruct snapshots and compare replay output vs original.

## Implementation Plan Applied
1. Create canonical trade entrypoint that always emits normalized proof bundle and applies safety before persistence.
2. Refactor all `/api/trade*` routes to call canonical entrypoint.
3. Add migration to normalize `proof_bundle` JSONB fields required for audit/replay.
4. Add calibration threshold update loop + event persistence.
5. Add deterministic replay support (`replayTrade`) and internal ops route.
