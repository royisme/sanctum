# Sprite - Telegram Capture Bot

Telegram webhook bot that captures messages and saves them to a GitHub vault's `00_Inbox/` folder as Markdown with YAML frontmatter.

## Tech Stack

- **Hono** - Fast web framework for Cloudflare Workers (routing)
- **grammY** - Telegram Bot Framework (handlers, middleware)
- **Cloudflare Workers** - Serverless runtime

## Architecture

```
sprite/
├── src/
│   ├── index.ts           # Worker entry point, Hono app
│   ├── types.ts           # TypeScript interfaces
│   ├── routes/
│   │   └── webhook.ts     # POST /:token webhook endpoint
│   ├── telegram/
│   │   └── bot.ts         # Bot configuration, handlers
│   ├── handlers/
│   │   └── capture.ts     # Extract text, URLs from messages
│   ├── markdown/
│   │   └── format.ts      # Generate YAML frontmatter + Markdown
│   └── github/
│       └── contents.ts    # GitHub Contents API write
├── wrangler.jsonc
└── package.json
```

## Setup

```bash
bun install
```

## Environment Variables

Set these via `wrangler secret put`:

```bash
# Required
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put GITHUB_TOKEN
wrangler secret put REPO_OWNER
wrangler secret put REPO_NAME

# Optional (recommended for additional webhook verification)
wrangler secret put TELEGRAM_WEBHOOK_SECRET_TOKEN
```

## Development

```bash
bun run dev
```

## Deployment

```bash
bun run deploy
```

## Telegram Webhook Setup

After deployment, set the webhook with your bot:

```bash
# Using the bot token in the URL path
curl -F "url=https://your-worker.dev/YOUR_BOT_TOKEN" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

The webhook URL format is: `https://{worker-domain}/{TELEGRAM_BOT_TOKEN}`

## Captured Format

Messages are saved to `00_Inbox/` as:

```markdown
---
source-type: url|text
source-url: https://...
created-at: 2024-01-01T00:00:00.000Z
tags: []
language: en
---

Original message text here
```

## Future Expansion

- **Commands**: Add command handlers in `telegram/bot.ts`
- **Callbacks**: Handle inline keyboard callbacks in handlers/
- **Bot API**: Use `ctx.api` for sending responses via Telegram API
- **Classification**: Add inbox classification logic in handlers/

## Notes

- No LLM calls in v1
- No local scripts required
- Minimal dependencies for capture-only functionality