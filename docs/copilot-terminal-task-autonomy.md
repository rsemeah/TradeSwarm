# Copilot Terminal Task Autonomy — Secure Task Prompt Contract

## 1. Execution Model

- **Mode:** Local machine task (VS Code integrated terminal).
- Tasks are defined in `.vscode/tasks.json` and executed within VS Code via
  `Terminal → Run Task`.
- Copilot agent actions are scoped to `${workspaceFolder}` — the repository
  root and its subdirectories — and may not traverse paths outside
  `rsemeah/TradeSwarm`.
- No remote execution, no cloud shell, no elevated shell is used. All tasks run
  in the developer's local user context.

## 2. Secrets and Sandboxing

- **Secrets must never be hard-coded** in `.vscode/tasks.json` or any committed
  file. Reference them via environment variables sourced from a local `.env`
  file (gitignored) or a secrets manager (e.g., Doppler, 1Password CLI,
  `direnv`).
- The `.env` file is listed in `.gitignore` and must not be committed.
- Tasks that require API credentials (e.g., `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
  must read from environment variables only. Example pattern:

  ```jsonc
  // .vscode/tasks.json (reference, not inline secret)
  "env": {
    "MY_KEY": "${env:MY_KEY}"
  }
  ```

- Sandboxing: tasks run without network-access elevation. Any task requiring
  outbound network access must be explicitly noted and approved before adding it
  to `tasks.json`.

## 3. Allowed Operational Path

Copilot is authorized to create or modify tasks scoped to:

```
rsemeah/TradeSwarm/                   ← repository root (${workspaceFolder})
├── .vscode/tasks.json                ← task definitions
├── scripts/                          ← build/lint/governance helpers
├── lib/                              ← engine library code
├── app/                              ← Next.js app routes
├── src/                              ← adapter source
├── docs/                             ← documentation
└── __tests__/ tests/                 ← test suites
```

Copilot may **not** execute tasks that:

- Write outside `${workspaceFolder}`.
- Modify `.github/` CI workflow files (except under explicit review approval).
- Access or print secrets to stdout.
- Disable lint, typecheck, or build gates.

## 4. Sample Terminal Tasks for Validation

The following two tasks in `.vscode/tasks.json` provide a minimal validation
run to confirm that the terminal task integration is operational:

### 4a. Echo validation

```json
{
  "label": "Validate: echo",
  "type": "shell",
  "command": "echo 'TradeSwarm terminal task validation OK'",
  "options": { "cwd": "${workspaceFolder}" }
}
```

**Expected output:**

```
TradeSwarm terminal task validation OK
```

### 4b. Node version check

```json
{
  "label": "Validate: node --version",
  "type": "shell",
  "command": "node --version",
  "options": { "cwd": "${workspaceFolder}" }
}
```

**Expected output:** `v20.x.x` (or whichever Node version is active in the
local environment; CI requires Node 20).

To run either task: open the VS Code Command Palette (`Ctrl+Shift+P` /
`⇧⌘P`) → **Tasks: Run Task** → select the task label.

## 5. Revocation and Rotation of Access

### Revoking Copilot terminal task autonomy

1. Remove or restrict the `.vscode/tasks.json` entries that grant Copilot
   execution authority (or delete the file entirely if no other tasks are needed).
2. In VS Code Settings (`settings.json`), set:
   ```json
   "github.copilot.chat.agent.runTasks": false
   ```
   to prevent Copilot from invoking any VS Code task.
3. Revoke the relevant GitHub Copilot seat in
   **GitHub → Organization Settings → Copilot → Seat management**.

### Rotating credentials referenced by tasks

1. Identify the secret name (e.g., `GROQ_API_KEY`).
2. Generate a new credential from the provider dashboard.
3. Update the value in your local `.env` file (or secrets manager vault).
4. Revoke the old credential at the provider.
5. Restart any running `pnpm dev` processes so the new value is picked up.
6. For CI/CD secrets, update the corresponding GitHub Actions secret under
   **Repository → Settings → Secrets and variables → Actions**.

### Token rotation schedule

| Secret | Recommended rotation | Owner |
|---|---|---|
| `GROQ_API_KEY` | 90 days | Platform lead |
| `SUPABASE_SERVICE_ROLE_KEY` | 90 days | Platform lead |
| `INTERNAL_JOBS_TOKEN` | 30 days | Ops |
| `AI_GATEWAY_API_KEY` | 90 days | Platform lead |

## 6. Security and Legal Review Requirement

Before granting expanded Copilot task autonomy (e.g., tasks that write to the
filesystem, invoke external APIs, or run deployment commands), the following
reviews are required:

- **Security review:** A maintainer with security responsibility must review the
  proposed `tasks.json` entries for command-injection risk, secret-exposure
  risk, and scope creep beyond `${workspaceFolder}`.
- **Legal review:** Any task that transmits code or data to a third-party AI
  service must be reviewed for compliance with applicable data-residency,
  confidentiality, and IP-ownership policies.
- **Approval gate:** Changes to `.vscode/tasks.json` that add new `shell`-type
  tasks with network access must pass the existing CI checks
  (`pnpm lint`, `pnpm typecheck`, `pnpm build`) and receive at least one
  PR approval before merging, consistent with the branch-protection rules in
  `.github/branch-protection-checklist.md`.

All of the above is consistent with and subordinate to the
[RedLantern Repository Marshal Policy](../AGENTS.md).
