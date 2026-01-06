# Crucible Tasks (Process Layer)

Scope: `crucible/` Python 3.12 processing engine.

Primary runtime: GitHub Actions in the Target Vault repo.
Secondary runtime: local invocation (optional).

Core goal:
- Batch-process `00_Inbox/` items into PARA folders using an Anthropic-compatible LLM endpoint.

## Contract with rituals (GitHub Actions)

Rituals must be able to install Crucible from GitHub using a pinned commit SHA:

- Install command shape:
  - `uv pip install "crucible @ git+https://github.com/<owner>/<repo>.git@<SHA>#subdirectory=crucible"`

Constraints:
- The workflow must not install from an unpinned ref (no `@main`).
- After installation, these module entrypoints must work:
  - `uv run python -m crucible.llm.classify_inbox`
  - `uv run python -m crucible.init_vault` (once implemented)

## Configuration (environment variables)

Required:
- `VAULT_PATH`: absolute path to the cloned Target Vault (GitHub Actions: `${{ github.workspace }}`).

Required for LLM calls (explicitly read and applied):
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_MODEL`

Notes:
- `ANTHROPIC_BASE_URL` and `ANTHROPIC_MODEL` must be explicitly read by Crucible and used to configure the client. Do not rely on SDK implicit defaults.

## Architecture (internal module boundaries)

- `crucible/llm/classify_inbox.py`: orchestration (scan inbox, build prompt, apply result)
- `crucible/llm/providers/anthropic_provider.py`: Anthropic SDK caller (must explicitly apply base_url and model)
- `crucible/init_vault.py`: ensure required vault directories exist
- `crucible/jobs/generate_resume.py`: job synthesis (out of GH Actions scope for now)

## Ticket C0 - Make Crucible installable from GitHub subdirectory

Goal:
- Ensure `uv pip install "crucible @ git+...@<SHA>#subdirectory=crucible"` works reliably in GitHub Actions.

Inputs:
- Crucible source code at `crucible/` in this repo.

Deliverables:
- Fix `crucible/pyproject.toml` packaging metadata and package discovery so `import crucible` works after installation.
- Ensure `readme` points to an existing file (either add `crucible/README.md` or adjust metadata).

Constraints:
- Use `uv` in all install/run instructions.

Acceptance:
- In a clean environment, the install command succeeds.
- `uv run python -m crucible.llm.classify_inbox --help` (or equivalent import) works without import errors.

## Ticket C1 - Add vault initialization entrypoint

Goal:
- Implement `crucible/init_vault.py` to create required directories in the target vault.

Inputs:
- `VAULT_PATH`

Behavior:
- Creates (if missing):
  - `00_Inbox/`
  - `00_Inbox/_failed/`
  - `01_Projects/`
  - `02_Areas/`
  - `02_Jobs/`
  - `02_Jobs/Generated/`
  - `03_Resources/`
  - `04_Archive/`

Acceptance:
- Running the module on an empty vault creates the full directory set.
- Re-running is idempotent (no errors, no destructive changes).

## Ticket C2 - Replace provider selection with Anthropic-compatible provider

Current state (for reference):
- `crucible/llm/classify_inbox.py` selects providers via `LLM_PROVIDER` and reads `LLM_API_KEY`.
- `crucible/llm/providers/claude.py` hardcodes `https://api.anthropic.com/v1/messages`.

Goal:
- Standardize on a single Anthropic-compatible provider and env var contract:
  - `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`

Behavior:
- Provider must:
  - Build the request against `ANTHROPIC_BASE_URL` (not hardcoded).
  - Send model `ANTHROPIC_MODEL`.
  - Return parsed JSON dict matching the classification schema.

Failure modes:
- Missing required env vars: fail-fast with explicit error.
- Non-JSON or schema-invalid output: raise error (caller decides how to fail over).

Acceptance:
- With valid env vars set, `call_llm(prompt)` returns a dict.
- With missing env vars, it fails early and clearly.

## Ticket C3 - Classification correctness and robustness

Goal:
- Make `classify_inbox` behavior match SPEC and handle failures predictably.

Inputs:
- Inbox markdown files in `VAULT_PATH/00_Inbox/**/*.md`.

Behavior:
- Ignore files whose names start with `_`.
- For each classified item:
  - Move to target directory based on category mapping.
  - Use `topic` to create a topic folder (sanitized).
  - Update `Index.md` in the topic folder.
- On classification failure:
  - Move item to `00_Inbox/_failed/`.
  - Return a non-zero exit code so the workflow signals failure.

Acceptance:
- A test vault with 1-2 items is moved into correct PARA folders.
- Invalid category results in `_failed` move.

## Ticket C4 - Update rituals contract to pin commit SHA

Goal:
- Update the Target Vault workflow contract to install crucible at a pinned SHA.

Requirements:
- Use a workflow variable like `SANCTUM_SHA`.
- Install command must include `@${{ vars.SANCTUM_SHA }}`.

Acceptance:
- Workflow uses pinned SHA and no longer installs from an unpinned ref.

## Ticket C5 - Resume generation (deferred)

Goal:
- Keep `crucible/jobs/generate_resume.py` functional, but do not block inbox classification on it.

Acceptance:
- Local run is documented and works after C0/C2 changes.
