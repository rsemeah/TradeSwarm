# Main Branch Protection Checklist

Apply these rules in GitHub Settings → Branches → `main`:

1. Require a pull request before merging.
2. ~~Require approvals (minimum 1).~~ — **Disabled for solo repo.** Requiring an external approval blocks the maintainer from merging their own CI-passing PRs. Enable only when collaborators are added.
3. Require status checks to pass before merging:
   - `build-and-typecheck`
   - `analyze` (CodeQL)
   - `codex-policy`
4. Require branches to be up to date before merging.
5. Enable auto-merge.
6. (Optional, recommended) enable merge queue for high-traffic periods.
7. Block force pushes.
8. Block branch deletion.
9. Restrict who can push to `main`.

## Recommended solo-repo rule set

For a solo maintainer, the recommended branch protection configuration is:

```
✔ Require status checks (build-and-typecheck, analyze, codex-policy)
✔ Require branch to be up to date before merging
✔ Allow / enable auto-merge
✔ Block force pushes
✖ Require approving review  ← remove this for solo repos
```

This keeps CI discipline without blocking the maintainer from merging their own PRs.
To apply: GitHub → Settings → Branches → Edit rule for `main` → uncheck
"Require pull request reviews before merging" → Save.

This repository intentionally enforces governance before strategy iteration.
