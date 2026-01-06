# Sprite Tasks (Capture Layer)

Scope: `sprite/` Cloudflare Worker (Hono + TypeScript).

Non-goals (v1):
- No LLM calls.
- No inbox classification.
- No dependency on local scripts.

Guiding principles:
- Keep the webhook surface small and stable.
- Design for future Bot API features (commands, callbacks, replies) by isolating parsing, routing, and side-effects.
- Favor minimal dependencies for capture-only, but we have already chosen grammY as the bot framework for extensibility.

## Technology decision

- Use `grammY` to handle Telegram updates (commands, middleware, callbacks).
- Use Hono only for routing and token validation.
- Wire via `webhookCallback(bot, "hono")` so grammY can run inside a Cloudflare Worker request.

## Architecture (internal module boundaries)

- `routes/webhook.ts`: Hono route `POST /:token` + auth + pass update into grammY
- `telegram/bot.ts`: create and configure the `Bot` instance (middleware, commands)
- `handlers/*`: grammY middleware/handlers (capture, commands, future features)
- `markdown/format.ts`: build frontmatter + markdown body
- `github/contents.ts`: GitHub Contents API write (side-effect)
- `telegram/api.ts`: optional thin Telegram Bot API helpers (future)

## Ticket S0 - Add grammY dependency and Worker wiring

Goal:
- Introduce grammY and wire it to the Hono route without changing the external webhook contract.

Must do:
- Add `grammy` dependency in `sprite/package.json`.
- Add a bot construction module (see `telegram/bot.ts`) that registers handlers.
- Use `webhookCallback(bot, "hono")` inside the authenticated Hono route.

Constraints:
- Keep the route as `POST /{TELEGRAM_BOT_TOKEN}`.
- Do not introduce polling.

Acceptance:
- A minimal handler (e.g., `bot.on("message:text", ...)`) runs when POSTing a Telegram update.

## Environment variables (Wrangler secrets)

Required:
- `TELEGRAM_BOT_TOKEN`
- `GITHUB_TOKEN`
- `REPO_OWNER`
- `REPO_NAME`

Optional (recommended):
- `TELEGRAM_WEBHOOK_SECRET_TOKEN` (Telegram webhook secret_token, if you want Telegram-side verification in addition to path token)

## Ticket S1 - Webhook route and token validation (Hono + grammY)

Goal:
- Provide a Telegram webhook POST endpoint and validate bot token.

Route choice:
- Use `POST /{TELEGRAM_BOT_TOKEN}`.

Implementation note:
- Hono performs token validation and then delegates request handling to grammY via `webhookCallback(bot, "hono")`.

Inputs:
- HTTP POST body: Telegram Update JSON.

Outputs:
- `2xx` when request accepted and processing succeeded.
- `401/403` when token invalid.
- `400` when request body missing or invalid.

Dependencies:
- Env `TELEGRAM_BOT_TOKEN` available.

Failure modes:
- Missing `TELEGRAM_BOT_TOKEN`: fail-fast with explicit error.

Acceptance:
- POST with correct token returns `2xx`.
- POST with incorrect token returns `401/403`.

## Ticket S2 - Capture handler (grammY) produces a capture event

Goal:
- Extract text, URL entities, and minimal metadata needed for capture.

Inputs:
- grammY `ctx` from message updates (primarily `ctx.message`).

Output (internal event object, for downstream formatting):
- `rawText: string`
- `sourceType: "url" | "text"` (v1)
- `sourceUrl: string` (empty when not present)
- `createdAt: string` (ISO8601)
- `tags: string[]` (default `[]`)
- `language: string` (default `""`)

Rules:
- `rawText` comes from message text.
- If entities include a URL entity, derive `sourceUrl` using `offset/length` substring from `rawText`.
- If URL entity exists: `sourceType = "url"`, else `sourceType = "text"`.
- `createdAt = new Date().toISOString()`.

Failure modes:
- Update is not a text message: ignore (or handle separately later) and return `2xx`.

Acceptance:
- URL message: extracted `sourceUrl` matches substring.
- Text-only message: `sourceType=text`, `sourceUrl=""`.

## Ticket S3 - Generate Markdown with YAML frontmatter

Goal:
- Format capture event into SPEC-compliant Markdown.

Inputs:
- Capture event from S2.

Outputs:
- `filename: string`
- `markdownContent: string`

Frontmatter fields (must include):
- `source-type`
- `source-url`
- `created-at`
- `tags`
- `language`

Filename:
- `inbox-{timestamp}.md`
- Normalize timestamp to avoid `:` (replace with `-`).

Content body:
- Include original text content.

Acceptance:
- Frontmatter parses as YAML.
- Filename contains no `:`.

## Ticket S4 - Write inbox item to target vault via GitHub Contents API

Goal:
- Persist Markdown to `00_Inbox/` in target vault repo.

Inputs:
- `filename`, `markdownContent` from S3.

Env:
- `GITHUB_TOKEN`, `REPO_OWNER`, `REPO_NAME`.

Behavior:
- Use GitHub Contents API `PUT` to `00_Inbox/{filename}`.
- Base64 encode content.
- Commit message: `sprite: capture inbox item`.

Conflict handling:
- If GitHub returns conflict/file-exists (often 409/422), retry once with a suffix (timestamp with milliseconds or random suffix).
- If still failing, return `502` and log status.

Acceptance:
- New file appears in `00_Inbox/` with correct content.
- Simulated name collision triggers retry and still writes successfully.

## Ticket S5 - Response semantics and minimal observability

Goal:
- Return quickly and correctly to Telegram; expose enough logs for debugging.

Behavior:
- On success: return `200` with JSON `{ ok: true }`.
- On GitHub failure: return non-2xx so Telegram can retry.
- Log: token mismatch, parsing errors, GitHub status code (never log secrets).

Acceptance:
- GitHub failure path returns non-2xx and logs reason.

## Ticket S6 - Update Sprite deployment docs

Goal:
- Make `sprite/README.md` sufficient to deploy and set webhook.

Must include:
- `bun install`, `bun run deploy`.
- `wrangler secret put` for required env vars.
- Telegram `setWebhook` example using the `/{TELEGRAM_BOT_TOKEN}` path.

Also include:
- Note that the implementation uses `grammY` (commands/middleware) and Hono only for routing.
- A short section for future expansion: where to add commands, callbacks, and Bot API calls.

Acceptance:
- A fresh setup can follow README to deploy and successfully capture one message.
