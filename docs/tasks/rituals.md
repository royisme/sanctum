# Rituals Tasks (GitHub Actions Templates)

Scope: `rituals/` templates that are copied into the Target Vault repo under `.github/workflows/`.

Core goal:
- Run Crucible classification on a schedule and commit the results back to the Target Vault.

Non-goals:
- Rituals should not contain application logic (classification logic lives in Crucible).

## Contract dependencies

- The Target Vault workflow must install Crucible from GitHub using a pinned commit SHA.
- Crucible must provide module entrypoints usable from Actions:
  - `uv run python -m crucible.init_vault`
  - `uv run python -m crucible.llm.classify_inbox`

## Required repository configuration (Target Vault)

GitHub Actions variables (recommended):
- `SANCTUM_REPO`: `<owner>/<repo>` for the sanctum repo containing `crucible/`.
- `SANCTUM_SHA`: pinned commit SHA to install Crucible.

GitHub Actions secrets:
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_MODEL`

## Ticket R0 - Pin Crucible install to commit SHA

Current state (for reference):
- `rituals/classify-inbox.yml` installs from `SANCTUM_REPO` without pinning.

Goal:
- Install crucible using a pinned commit SHA.

Required change:
- Install command must include `@${{ vars.SANCTUM_SHA }}`.

Example shape:
- `uv pip install "crucible @ git+https://github.com/${{ vars.SANCTUM_REPO }}.git@${{ vars.SANCTUM_SHA }}#subdirectory=crucible"`

Acceptance:
- Workflow refuses to run without `SANCTUM_SHA` (fail-fast or clearly logged).
- The installed Crucible version is stable and reproducible.

## Ticket R1 - Switch workflow env vars to Anthropic-compatible contract

Current state (for reference):
- Workflow passes `LLM_PROVIDER`, `LLM_API_KEY`, `CLAUDE_MODEL`, `OPENAI_MODEL`.

Goal:
- Standardize workflow env vars to match Crucible contract:
  - `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `VAULT_PATH`.

Acceptance:
- `uv run python -m crucible.llm.classify_inbox` runs with only these env vars present.

## Ticket R2 - Ensure vault initialization runs before classification

Goal:
- Ensure required directories exist before classification.

Behavior:
- Add a step that runs `uv run python -m crucible.init_vault` before classifier.

Acceptance:
- Fresh/empty vault repo gains required directory structure before classifier runs.

## Ticket R3 - Commit and push changes safely

Goal:
- Commit only when there are changes.
- Ensure git identity is configured in the workflow.

Required behavior:
- Configure `git config user.name` and `git config user.email` inside the workflow run.
- If `git status --porcelain` is empty, do not commit.

Acceptance:
- Workflow does not create empty commits.
- Workflow can push to the target vault repo using default GITHUB_TOKEN permissions.

## Ticket R4 - Validate workflow permissions and security

Goal:
- Ensure permissions are minimal but sufficient.

Behavior:
- Set job permissions explicitly (recommended):
  - `contents: write`

Acceptance:
- Workflow can push changes, but does not have unnecessary permissions.

## Ticket R5 - Update rituals documentation in SPEC task files

Goal:
- Ensure the tasks documentation explains the required vars/secrets for the target vault.

Acceptance:
- A user can copy `rituals/classify-inbox.yml` into a target vault and configure it without reading source code.
