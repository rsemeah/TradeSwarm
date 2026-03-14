# .github — Repository Configuration

## Automated Review Requests

The workflow [`workflows/request-review.yml`](workflows/request-review.yml) automatically requests
reviewers whenever a pull request is opened, reopened, or updated.

**To change the reviewer list**, edit the `reviewers` array in `workflows/request-review.yml`
and the owner entries in [`CODEOWNERS`](CODEOWNERS).

> **Note:** Approvals cannot be automated — GitHub branch-protection rules require human
> review approvals and those cannot be granted programmatically by a workflow token.
