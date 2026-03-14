# Main Branch Protection Checklist

Apply these rules in GitHub Settings → Branches → `main`:

1. Require a pull request before merging.
2. Require approvals (minimum 1).
   - **Approval bottleneck note:** The `copilot-auto-approve` workflow automatically
     approves PRs from trusted bot actors (`copilot-swe-agent`, `dependabot[bot]`,
     `github-actions[bot]`) once CI, Safety Gate, and Codex Policy checks pass.
     Human approval remains required for all PRs authored by human contributors.
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

This repository intentionally enforces governance before strategy iteration.
