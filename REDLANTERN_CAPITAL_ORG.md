# RedLantern Capital — War Room Organization
**Version:** 1.0 | **Date:** 2026-06-10 | **Owner:** Ro (Rory Semeah)
**Status:** STANDUP IN PROGRESS — Pre-Phase gates SC-01→SC-04 required before any Capital agent is added

---

## Org Structure

```
RedLantern Studios (By Red LLC)
├── Division 1: Build Co
│   └── 11 SwarmClaw agents — builds and deploys products
│       └── Conductor: ROBBY (robby-conductor-001)
└── Division 2: Capital (RedLantern Capital)
    └── TradeSwarm — 7 sub-divisions
        ├── Research Division
        ├── Data Division
        ├── Signal Division
        ├── Risk Division
        ├── Execution Division   ← fast path (see below)
        ├── Observability Division
        └── Halal Partition      ← Alif compliance track
```

---

## Division Directors (CW-02 — Ro approval required)

| Division | Director Role | SwarmClaw Config | Status |
|----------|--------------|-----------------|--------|
| Research | Research Director | `swarmclaw/agents/capital/research-director.json` | ❌ NOT CREATED |
| Data | Data Director | `swarmclaw/agents/capital/data-director.json` | ❌ NOT CREATED |
| Signal | Signal Director | `swarmclaw/agents/capital/signal-director.json` | ❌ NOT CREATED |
| Risk | Risk Director | `swarmclaw/agents/capital/risk-director.json` | ❌ NOT CREATED |
| Execution | Execution Director | `swarmclaw/agents/capital/execution-director.json` | ❌ NOT CREATED |
| Observability | Observe Director | `swarmclaw/agents/capital/observe-director.json` | ❌ NOT CREATED |
| Halal Partition | Halal Director | `swarmclaw/agents/capital/halal-director.json` | ❌ NOT CREATED |

**Gate:** All 7 require Ro approval before spinning up (CW-02). No Capital agent added before SC-01→SC-04 complete.

---

## Fast Path Rule (SC-03)

Execution Division agents **bypass ROBBY conductor** for:
- Order placement
- Kill switch activation
- Arbitrage execution

Reason: order latency matters. Conductor overhead is acceptable for analysis, not execution.

**All other Capital requests route through ROBBY.**

Fast path triggers:
1. Signal exits Risk Division with TruthSerum PASS verdict
2. Execution Director receives signal
3. Execution Director places order directly — no ROBBY routing
4. Order confirmation + TruthCal™ receipt posted to Observability Division

---

## TRUTH Agent — Capital CRO (SC-02)

- **Agent ID:** `7a4b9c1d`
- **Role:** Capital CRO — mandatory gate on all Capital execution outputs
- **Rule:** No trade signal exits Risk Division without TruthSerum PASS verdict
- **ROBBY routing:** All Capital outputs route through TRUTH before execution
- **Proof contract:** TRUTH agent returns signed verdict (PASS/FAIL) + reason code
- **Status:** ❌ CRO-tier promotion pending Ro approval (SC-02)

---

## Namespace (SC-04)

| Prefix | Division | Example |
|--------|----------|---------|
| `T-` | Capital (RedLantern Capital) | `T-01`, `T-16`, `T-33` |
| `P-` | Build Co (Division 1) | `P-01`, `P-07` |

No namespace collision. routing_log.md updated to reflect T-prefix for all Capital tasks.

---

## Handoff Contract: Build Co → Capital

| Milestone | Ownership Transfer |
|-----------|-------------------|
| CW-05 complete (files in GitHub) | Code artifacts handed to Capital Division Directors |
| T28 live (observability dashboard) | Operational monitoring transferred to Observability Division |
| T33 (ALPACA_PAPER=false) | Full execution ownership: Capital War Room |

Build Co retains deployment and infrastructure responsibility post-T33.

---

## Channel: #capital (CW-03)

- All Capital agents namespaced under #capital channel
- Zero Capital agents outside this channel
- Build Co agents operate in their existing channels
- Status: ❌ NOT CREATED — CW-03 pending

---

*Pre-Phase (SC-01→SC-04) is a hard gate. No Capital agent added until all 4 are confirmed.*
