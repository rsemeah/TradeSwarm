# Main Branch Protection Checklist

## Current settings — apply in GitHub Settings → Branches → `main`

| # | Rule | Keep? |
|---|------|-------|
| 1 | Require a pull request before merging | ✅ Keep |
| 2 | **Require approvals (minimum 1)** | ❌ **Disable for solo-builder** |
| 3 | Require status checks to pass (`build-and-typecheck`, `analyze`, `codex-policy`) | ✅ Keep |
| 4 | Require branches to be up to date before merging | ✅ Keep |
| 5 | Enable auto-merge | ✅ Keep |
| 6 | Merge queue (optional, recommended for high-traffic) | Optional |
| 7 | Block force pushes | ✅ Keep |
| 8 | Block branch deletion | ✅ Keep |
| 9 | Restrict who can push to `main` | ✅ Keep |

---

## ⚠️ Approval Bottleneck — Minimum Change Needed

### What blocks merges today

The setting **"Require approvals"** (minimum 1) under Branch Protection Rules for `main`
forces every PR to wait for a human review approval before it can merge — even if all
status checks pass and auto-merge is enabled.

### Exact UI path to disable it

```
GitHub.com → rsemeah/TradeSwarm
  → Settings
    → Branches
      → Branch protection rules
        → Edit rule for "main"
          → Pull Requests section
            → "Require approvals"   ← uncheck this box (or set to 0)
          → Save changes
```

**Exact setting name:** `Require approvals`
**Location inside the rule:** *Pull Requests → Require approvals*
**Action:** Uncheck the checkbox (or set the required number to 0 if using Rulesets).

> All other rules (status checks, up-to-date branch, auto-merge) remain active.

---

## Merge Order (after approval gate is removed)

Once the approval requirement is disabled, merge PRs in this order:

1. **CI stabilizer PR first** — fixes action versions (`checkout@v4`, `setup-node@v4`) and
   ripgrep install so that all required status checks (`build-and-typecheck`, `analyze`,
   `codex-policy`) can actually pass.

2. **Gate/safety branch second** — `Tradeswarm/gate1` and any safety-wiring PRs that depend
   on a working CI baseline.

3. **Isolated docs / spec PRs after** — documentation, architecture, and spec PRs that carry
   no runtime risk can be merged in any order once the CI base is stable.

---

This repository intentionally enforces governance before strategy iteration.
