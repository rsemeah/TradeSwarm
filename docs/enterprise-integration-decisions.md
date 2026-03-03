# Enterprise Integration Decisions (Locked)

This document captures the implementation decisions for TradeSwarm's enterprise integration path.

## Decisions

1. Integration mode: **containerized services + TypeScript adapters** for TruthSerum and RobEngine.
2. Fail policy: TruthSerum is **fail-closed for execute**, previews may degrade with warning.
3. RobEngine rollout: feature-flagged; local regime remains default until promoted.
4. Canonical receipt keys: `envelope`, `market_context`, `regime`, `risk`, `deliberation`, `scoring`, `model_versions`, `provenance`, `engine_timeline`, `metadata`.
5. Preview persistence: no final receipt by default; preview telemetry should go to events.
6. Safety gates: configurable hard thresholds (spread, volume, OI, size cap, slippage, earnings blackout).
7. TruthSerum contract: strict `features_v1`, reject unknown features versions.
8. Idempotency: required for execute; optional for preview/simulate.
9. UI priority: receipt drawer first, card badges second.
10. Sprint target: minimal integration stack now; rollout UI + canary in phase 2.
