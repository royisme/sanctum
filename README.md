# Sanctum Gatherer

A knowledge management system built for the "Cloud Capture + Local Cultivation" workflow.

## Overview

Sanctum streamlines knowledge management by automating content capture and organization:

- **Sprite** - Cloudflare Worker that receives Telegram messages, enriches content via Firecrawl, classifies with Workers AI, and writes directly to your GitHub vault
- **Crucible** - Claude Code Plugin for local tasks (resume generation, vault initialization)

Your actual knowledge vault should be a separate GitHub repository (referred to as "Target Vault" below).

## Architecture (v2.0)

```
Telegram Message
  ↓
Sprite Worker (Cloudflare)
  ├─ Instant response (async queue)
  ├─ Firecrawl API (content extraction)
  ├─ Workers AI (PARA classification)
  └─ Direct write to PARA folders

Local Development
  ├─ Claude Code Plugin (resume gen, vault setup)
  └─ Zero runtime dependencies
```

## Key Features

- **Zero-cost serverless** - Powered by Cloudflare Workers free tier
- **AI-powered classification** - Automatic PARA categorization using Workers AI
- **Content enrichment** - Extract full article content from URLs via Firecrawl
- **Async processing** - Instant Telegram response, background queue processing
- **Local control** - Plugin-based local tools with Claude Code integration
- **Multi-language support** - Language-consistent classification and summaries

## Directory Structure

```
.
├── sprite/        # Capture layer: Cloudflare Worker (Hono + grammY)
├── crucible/      # Claude Code Plugin: resume gen + vault tools
├── docs/          # Specifications and documentation
└── rituals/       # Legacy GitHub Actions templates (deprecated in v2)
```

## Tech Stack

### Sprite
- **Runtime**: Cloudflare Workers
- **Framework**: Hono + grammY
- **Storage**: Cloudflare KV (message queue)
- **AI**: Workers AI (@cf/meta/llama-3.1-8b-instruct)
- **Content Extraction**: Firecrawl API
- **API Gateway**: Cloudflare AI Gateway (analytics + caching)

### Crucible
- **Format**: Claude Code Plugin
- **Runtime**: Zero dependencies (Claude handles execution)
- **Commands**: `/generate-resume`, `/init-vault`

## Quick Start

### 1. Deploy Sprite (Cloud Capture)

```bash
cd sprite
bun install

# Set secrets
bunx wrangler secret put TELEGRAM_BOT_TOKEN
bunx wrangler secret put GITHUB_TOKEN
bunx wrangler secret put FIRECRAWL_API_KEY

# Deploy
bun run deploy
```

Configure Telegram webhook (replace with your bot token):

```bash
curl -F "url=https://sprite.YOUR_ACCOUNT.workers.dev/YOUR_BOT_TOKEN" \
  "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook"
```

See [sprite/README.md](sprite/README.md) for detailed deployment guide.

### 2. Install Crucible Plugin (Local Tools)

```bash
# In Claude Code
/plugin install https://github.com/royzhu/gatherer.git#subdirectory=crucible

# Initialize your vault structure
/init-vault

# Generate resume from job description
/generate-resume path/to/job-description.md
```

See [crucible/README.md](crucible/README.md) for plugin documentation.

## Cost Estimate

All components run within free tiers:

- Cloudflare Workers: 100,000 requests/day
- Cloudflare KV: 100,000 reads/day
- Workers AI: 10,000 requests/day
- AI Gateway: Free

**Total**: $0 for typical personal use

## PARA Classification

Messages are automatically classified into PARA folders:

- **01_Projects/** - Active work with clear goals
- **02_Areas/** - Ongoing responsibilities
- **03_Resources/** - Reference materials
- **04_Archive/** - Completed/inactive items
- **02_Jobs/** - Job applications and opportunities

Each entry includes AI-generated summary and frontmatter:

```markdown
---
source: https://example.com
date: 2026-01-07
type: url
category: resources
topic: AI-Productivity
---

## AI Summary

Article about new AI tools for productivity...

---

[Full extracted content]
```

## Security

- All secrets managed via Cloudflare Secrets (no tokens in repo)
- Telegram webhook supports optional secret token for verification
- Firecrawl API keys stored in Cloudflare secrets



## Documentation

- [docs/SPEC.md](docs/SPEC.md) - Architecture specifications
- [docs/tasks/](docs/tasks/) - Task breakdowns
- [sprite/README.md](sprite/README.md) - Sprite deployment guide
- [crucible/README.md](crucible/README.md) - Plugin documentation

## License

MIT
