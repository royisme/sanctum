# Sprite - Telegram Message Processor

Cloudflare Worker that captures Telegram messages, enriches content via Firecrawl, classifies with Workers AI, and saves directly to GitHub vault PARA folders.

## Architecture

**v2 (Current) - Async Queue + Workers AI**

```
Telegram Message
  ↓
Sprite Worker (fetch handler)
  ├─ Bot commands (/start, /help) → OK
  └─ Regular messages → KV Queue → ✓
  
KV Queue (inbox:*)
  ↓
Scheduled Worker (cron: every 15 min)
  ↓
Preprocess
  ├─ Clean text (remove "链接：" prefix)
  ├─ Detect URL type (youtube/normal/text)
  └─ Enrich via Firecrawl API (extract full content)
  ↓
Workers AI Classification
  ├─ Model: @cf/meta/llama-3.1-8b-instruct
  ├─ Via: AI Gateway (caching + analytics)
  └─ Output: PARA category + topic + summary
  ↓
GitHub API (batch write)
  └─ Write to: 01_Projects/, 02_Areas/, 03_Resources/, 04_Archive/, 02_Jobs/
```

**Key Features:**
- ✅ Async processing (instant Telegram response)
- ✅ URL content enrichment (Firecrawl API)
- ✅ YouTube detection (marked as video type)
- ✅ AI-powered PARA classification
- ✅ Batch processing (efficient resource usage)
- ✅ Zero cost (Cloudflare free tier)

## Tech Stack

- **Hono** - Web framework for routing
- **grammY** - Telegram Bot Framework
- **Cloudflare Workers** - Serverless runtime
- **Cloudflare KV** - Message queue storage
- **Workers AI** - LLM inference (llama-3.1-8b)
- **AI Gateway** - Analytics, caching, rate limiting
- **Firecrawl API** - Web content extraction

## Directory Structure

```
sprite/
├── src/
│   ├── index.ts              # Main entry (fetch + scheduled handlers)
│   ├── types.ts              # Core type definitions
│   ├── types/
│   │   └── queue.ts          # Queue message types
│   ├── telegram/
│   │   └── bot.ts            # Bot setup + command handling
│   ├── handlers/
│   │   └── capture.ts        # Message extraction logic
│   ├── processor/
│   │   ├── index.ts          # Scheduled worker entry
│   │   ├── queue.ts          # KV queue operations
│   │   ├── preprocess.ts     # Text cleaning + Firecrawl
│   │   ├── classify.ts       # Workers AI classification
│   │   └── github.ts         # GitHub API batch write
│   ├── markdown/
│   │   └── format.ts         # Markdown formatting (legacy)
│   └── github/
│       └── contents.ts       # GitHub API helpers (legacy)
├── wrangler.jsonc            # Worker config (KV, AI, Cron)
├── package.json
├── DEPLOYMENT.md             # Detailed deployment guide
└── README.md                 # This file
```

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Create KV Namespace

```bash
bunx wrangler kv:namespace create INBOX_QUEUE
bunx wrangler kv:namespace create INBOX_QUEUE --preview
```

Update `wrangler.jsonc` with the generated IDs.

### 3. Create AI Gateway

1. Visit https://dash.cloudflare.com
2. Navigate to: **AI > AI Gateway > Create Gateway**
3. Name: `sanctum-classifier`
4. Click **Create**

### 4. Set Secrets

```bash
bunx wrangler secret put TELEGRAM_BOT_TOKEN
bunx wrangler secret put GITHUB_TOKEN
bunx wrangler secret put FIRECRAWL_API_KEY
```

### 5. Deploy

```bash
bun run deploy
```

### 6. Set Telegram Webhook

```bash
curl -F "url=https://sprite.YOUR_ACCOUNT.workers.dev/YOUR_BOT_TOKEN" \
  "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook"
```

**For detailed instructions**, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Environment Variables

| Variable | Type | Description |
|----------|------|-------------|
| `TELEGRAM_BOT_TOKEN` | Secret | Bot token from @BotFather |
| `GITHUB_TOKEN` | Secret | GitHub PAT with repo scope |
| `FIRECRAWL_API_KEY` | Secret | Firecrawl API key for URL extraction |
| `REPO_OWNER` | Config | GitHub vault owner (in wrangler.jsonc) |
| `REPO_NAME` | Config | GitHub vault repo name (in wrangler.jsonc) |
| `AI_GATEWAY_ID` | Config | AI Gateway ID (in wrangler.jsonc) |
| `INBOX_QUEUE` | Binding | KV namespace for message queue |
| `AI` | Binding | Workers AI binding |

## Output Format

Messages are saved to PARA folders with frontmatter:

```markdown
---
source: https://example.com
date: 2026-01-06
type: url
category: resources
topic: AI-Tools
---

## AI Summary

Article about new AI productivity tools...

---

[Full extracted content from Firecrawl]
```

## Development

```bash
bun run dev
```

## Monitoring

View logs:
```bash
bunx wrangler tail
```

Check queue:
```bash
bunx wrangler kv:key list --namespace-id=<YOUR_KV_ID> --prefix=inbox:
```

Manually trigger cron:
- Cloudflare Dashboard > Workers > sprite > Triggers > Cron Triggers > **Run Now**

## Cost Estimate

All within Cloudflare free tier:
- Workers: 100,000 requests/day
- KV: 100,000 reads/day
- Workers AI: 10,000 requests/day
- AI Gateway: Free

**Total**: $0 (for typical personal use)

## Comparison: v1 vs v2

| Feature | v1 (Old) | v2 (Current) |
|---------|----------|--------------|
| Processing | Sync (blocks user) | Async (instant ✓) |
| Storage | GitHub (direct) | KV Queue → GitHub |
| Classification | Crucible (Python + GH Actions) | Workers AI (inline) |
| URL Content | Raw URL only | Full content via Firecrawl |
| Output | `00_Inbox/*.md` | Direct to PARA folders |
| Cost | $0 | $0 |
| Dependencies | Crucible + Actions | Self-contained |

## Migration from v1

If you have an existing Sprite v1 deployment:

1. Deploy v2 (this version)
2. Old inbox files remain in `00_Inbox/` (not processed by v2)
3. Optionally: Delete Crucible workflows from vault repo
4. Optionally: Manually classify old inbox files or archive them

v2 does **not** process existing `00_Inbox/` files - it only handles new messages from the queue.

## Troubleshooting

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting steps.

## License

MIT