# Main Branch Protection Checklist

Apply these rules in GitHub Settings → Branches → `main`:

1. Require a pull request before merging.
2. Require approvals (minimum 1).
3. Require status checks to pass before merging:
   - `build-and-typecheck`
   - `analyze` (CodeQL)
4. Require branches to be up to date before merging.
5. Block force pushes.
6. Block branch deletion.
7. Restrict who can push to `main`.

This repository intentionally enforces governance before strategy iteration.
