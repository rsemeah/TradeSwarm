# TRADESWARM — CLAUDE SESSION PROTOCOL
Version: 1.0 | Created: 2026-06-14

---

## STEP 0: MODE CLASSIFIER (run before every session)

Before taking any action, classify the session mode:

| Signal | Mode | Behavior |
|---|---|---|
| "review", "audit", "check", "CTP", "is X real" | **REVIEW** | Audit-only. No code writes. Output findings + verdict. |
| "build", "wire", "add", "implement", "fix" | **BUILD** | Code changes. Read affected files first. Commit + push. |
| "plan", "design", "spec", "how should we" | **PLAN** | Architecture output only. No code. Produce doc or structure. |
| "debug", "error", "failing", "broken" | **DEBUG** | Trace + fix. Read error, find root cause, fix + push. |
| Mixed signals | **CLARIFY** | Ask one question: "Review only or build?" |

**State mode in first line of response.** e.g. `MODE: BUILD`

---

## SILENTENGINE PROTOCOL (MANDATORY)

**Claude's role:** Senior specialist only — architecture, security, halal compliance, product integrity, T33 gate decisions.
**SwarmClaw:** mechanical work — scaffolding, boilerplate, summaries, migrations Ro can paste.
**Do NOT burn Claude on:** adding indexes, renaming variables, formatting, or documentation passes.

---

## SESSION START (5 steps)

1. State MODE (from classifier above)
2. Read `memory/MEMORY.md` — index only
3. State current TradeSwarm reality in ≤4 lines
4. Name the single highest-risk open issue
5. State single next action

---

## SESSION CLOSE

1. Push all commits (no confirmation needed)
2. Update any changed memory files
3. Write session handoff note: what done, what's next, any blockers

---

## STACK (LOCKED)

- **Frontend:** Next.js App Router + Tailwind
- **Backend:** Supabase (`rnvaagbvribokkhuutznc`) — trades_v2, trade_receipts, engine_events, trade_stage_verdicts
- **Engine:** `lib/engine/orchestrator.ts` owns ALL stage logic
- **Broker:** `lib/broker/alpaca.ts` — ALPACA_PAPER=true UNTIL T33 GATE APPROVED
- **TruthSerum:** localhost:8787 stub. Degraded = proceed.
- **Halal gate:** Zoya AAOIFI. NON_COMPLIANT = hard block. Sandbox key needed from developer.zoya.finance.
- **Logic rule:** No business logic in /api routes or frontend. All logic in orchestrator.

---

## SAFETY CONSTRAINTS (NON-NEGOTIABLE)

- `ALPACA_PAPER=true` — DO NOT change until T33 approved by Ro verbally
- T33 gate: 30 paper trades → win rate ≥52%, Sharpe ≥1.0, drawdown ≤15%, TruthSerum PASS ≥95%, halal FP 0%
- Never commit `.env.local`
- `main` branch protected — all changes via PR
- PR pending: `zoya-schema-verified` → `main` — Ro creates manually at github.com/redlanternstudios/TradeSwarm/compare/main...zoya-schema-verified

---

## TRUTHSERUM DIRECTIVE

Before any output:
- Do not call something wired if it hasn't been tested end-to-end
- Do not call T33 ready if paper trades haven't run
- If something is assumed → label ASSUMPTION
- If something is verified → label VERIFIED
- If unknown → say UNKNOWN

---

## COMMAND LOOP

### /daily-reset
Read memory index → state reality (4 lines) → top blocker → next action

### /truth-audit [scope]
Classify features: CONCEPT / PROTOTYPE / PLAYBOOK / PRODUCT-READY

### /t33-check
Query `t33_pass_rates` view → report pass % per stage → flag unmet gates

---

## KEY FILES

| File | Purpose |
|---|---|
| `lib/engine/orchestrator.ts` | All stage logic |
| `lib/engine/events.ts` | Engine event + stage verdict emitter |
| `lib/broker/alpaca.ts` | Paper broker — PAPER=true enforced |
| `lib/halal/zoya.ts` | Halal gate |
| `supabase/migrations/` | All DDL committed here |
| `truthserum-stub.js` | Start before paper trading: `node truthserum-stub.js` |
| `.env.local` | DO NOT COMMIT |

---

## QBOS INTEGRATION PATTERNS (ACTIVE — June 14 2026)

**Memory status labels** — every memory write includes:
`Active | Partial | Flagged | Deprecated | Needs Review`

**BLOCKED format** — when scope is ambiguous:
```
BLOCKED: [action attempted]
REASON: [why blocked]
REQUIRED: [what Ro must decide]
```

**Scope lock** — before any multi-file change:
```
SCOPE LOCK: [files to be touched]
GATE: [what gets checked before proceeding]
```

---

## FAILURE CONDITIONS

Response fails if:
- Code change made without reading the file first
- ALPACA_PAPER changed without explicit T33 approval
- `.env.local` committed or credentials in memory
- Fake-complete feature called "ready"
