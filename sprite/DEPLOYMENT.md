# Sprite v2 Deployment Guide

## Prerequisites

1. Cloudflare account
2. Telegram Bot Token (from @BotFather)
3. GitHub Personal Access Token (with repo scope)
4. Firecrawl API Key (from https://firecrawl.dev)

## Step 1: Create KV Namespace

```bash
cd sprite

# Create production KV namespace
bunx wrangler kv namespace create INBOX_QUEUE
# Output: { binding = "INBOX_QUEUE", id = "xxxxx" }

# Create preview KV namespace  
bunx wrangler kv namespace create INBOX_QUEUE --preview
# Output: { binding = "INBOX_QUEUE", preview_id = "xxxxx" }
```

Update `wrangler.jsonc` with the IDs from above.

## Step 2: Create AI Gateway

1. Go to https://dash.cloudflare.com
2. Navigate to: AI > AI Gateway > Create Gateway
3. Name: `sanctum-classifier`
4. Click Create

## Step 3: Set Secrets

```bash
# Telegram Bot Token
bunx wrangler secret put TELEGRAM_BOT_TOKEN

# GitHub Token
bunx wrangler secret put GITHUB_TOKEN

# Firecrawl API Key
bunx wrangler secret put FIRECRAWL_API_KEY

# AI Provider API Key (Required for Universal Endpoint)
# For Workers AI: Create a Cloudflare API Token with "Workers AI Read" permission
# For OpenAI/Grok: Use your provider's API Key
bunx wrangler secret put AI_API_KEY
```

## Step 4: Configure Wrangler

Update `sprite/wrangler.jsonc` with your details:

```jsonc
{
  "vars": {
    "REPO_OWNER": "your-github-username",
    "REPO_NAME": "your-vault-repo",
    "CF_ACCOUNT_ID": "your-cloudflare-account-id", // Find in CF Dashboard URL
    "AI_GATEWAY_ID": "sanctum-classifier",
    "AI_MODEL": "workers-ai/@cf/meta/llama-3.1-8b-instruct" // or "openai/gpt-4o", etc.
  }
}
```

## Step 5: Deploy

```bash
bun install
bun run deploy
```

## Step 5: Set Telegram Webhook

```bash
curl -F "url=https://sprite.your-account.workers.dev/<YOUR_BOT_TOKEN>" \
  "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook"
```

Replace:
- `sprite.your-account.workers.dev` with your actual worker domain
- `<YOUR_BOT_TOKEN>` with your actual bot token

## Step 6: Test

Send a message to your Telegram bot. You should receive a "✓" response immediately.

After 15 minutes (next cron run), check your GitHub vault to see the classified message.

## Monitoring

View logs:
```bash
bunx wrangler tail
```

Check queue status:
```bash
bunx wrangler kv:key list --namespace-id=<YOUR_KV_ID> --prefix=inbox:
```

## Troubleshooting

### Messages not appearing in GitHub

1. Check worker logs: `bunx wrangler tail`
2. Check KV queue: `bunx wrangler kv:key list --namespace-id=<ID>`
3. Manually trigger scheduled worker (in Cloudflare Dashboard > Workers > sprite > Triggers > Cron Triggers > Run Now)

### Classification errors

- Check AI Gateway logs in Cloudflare Dashboard
- Verify FIRECRAWL_API_KEY is set correctly
- Check GitHub token has write permissions

## Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `TELEGRAM_BOT_TOKEN` | Secret | Bot token from @BotFather |
| `GITHUB_TOKEN` | Secret | GitHub PAT with repo scope |
| `FIRECRAWL_API_KEY` | Secret | Firecrawl API key |
| `REPO_OWNER` | Config | GitHub repo owner (in wrangler.jsonc) |
| `REPO_NAME` | Config | GitHub repo name (in wrangler.jsonc) |
| `AI_GATEWAY_ID` | Config | AI Gateway ID (in wrangler.jsonc) |

## Architecture

```
Telegram Message
  ↓
Sprite Worker (fetch handler)
  ↓
KV Queue (inbox:*)
  ↓
Scheduled Worker (every 15 min)
  ↓
Preprocess (Firecrawl API)
  ↓
Workers AI (Classification)
  ↓
GitHub API (Write to PARA folders)
```

## Cost Estimate

- Workers: Free tier (100,000 requests/day)
- KV: Free tier (100,000 reads/day)
- Workers AI: Free tier (10,000 requests/day)
- AI Gateway: Free
- **Total**: $0 (within free tier limits)
