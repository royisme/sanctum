# Sanctum System Specification

> Version: 2.0.0
> Last Updated: 2026-01-07
> Status: Active

## 1. Overview

### 1.1 Purpose

A "Cloud Capture + Local Cultivation" knowledge management system:
- 24/7 unattended information capture (Telegram Bot → Cloudflare Worker)
- Real-time AI classification (Workers AI Gateway)
- Local deep transformation (Obsidian + Claude Code Plugin)

### 1.2 Components

| Component | Responsibility |
|-----------|---------------|
| **Sprite** | Telegram message capture, AI classification, and GitHub vault writing |
| **Claude Code Plugin** | Local tools for resume generation and vault initialization |

### 1.3 Non-Goals (v2.0)

- No Web Clipper (future enhancement)
- No multi-user support
- No GitHub Actions batch processing (replaced by real-time processing)

---

## 2. Architecture

### 2.1 System Diagram (v2)

```
+---------------------------------------------------------------------+
|                           SANCTUM SYSTEM v2                          |
+---------------------------------------------------------------------+
|                                                                     |
|   CAPTURE + CLASSIFY LAYER (Cloud)                                  |
|   +-------------------------------------------------------------+   |
|   | SPRITE (Cloudflare Worker)                                  |   |
|   |                                                             |   |
|   | Telegram Webhook                                            |   |
|   |     ↓                                                       |   |
|   | KV Queue (inbox:*)                                          |   |
|   |     ↓ (cron: every 5 min)                                   |   |
|   | Preprocess (Firecrawl URL enrichment)                       |   |
|   |     ↓                                                       |   |
|   | AI Gateway → Workers AI (classification)                    |   |
|   |     ↓                                                       |   |
|   | GitHub API (write to PARA folders)                          |   |
|   +-------------------------------------------------------------+   |
|                              |                                      |
|                              | GitHub API (create file)             |
|                              v                                      |
|   +-----------------------------------------------------------------+
|   |                   TARGET VAULT (GitHub Repo)                    |
|   |                                                                 |
|   |   01_Projects/       02_Areas/        03_Resources/             |
|   |   +-- TopicA/        +-- Health/      +-- AI-Tools/             |
|   |       +-- item.md        +-- ...          +-- item.md           |
|   |   02_Jobs/           04_Archive/                                |
|   |   +-- company.md     +-- ...                                    |
|   |   +-- Generated/                                                |
|   |       +-- resume.md                                             |
|   +-----------------------------------------------------------------+
|                              |                                      |
|                              | git pull (Obsidian Git)              |
|                              v                                      |
|   SYNTHESIS LAYER (Local)                                           |
|   +-----------------------------------------------------------------+
|   |              LOCAL WORKSTATION                                  |
|   |                                                                 |
|   |   Obsidian ──────────> Claude Code                              |
|   |   (view/edit)          /generate-resume job.md                  |
|   |                        /init-vault                              |
|   +-----------------------------------------------------------------+
|                                                                     |
+---------------------------------------------------------------------+
```

### 2.2 Data Flow

```
[User]
   |
   | 1. Send message to Telegram
   v
[Sprite - CF Worker]
   |
   | 2. Queue to KV (instant response to user)
   v
[KV Queue - inbox:*]
   |
   | 3. Cron trigger (every 5 min)
   v
[Sprite - Scheduled Handler]
   |
   | 4. Preprocess: clean text, extract URL content (Firecrawl)
   | 5. Classify: AI Gateway → Workers AI
   | 6. Write: GitHub API → PARA folder
   v
[Target Vault - PARA folders]
   |
   | 7. Obsidian Git plugin pulls changes
   v
[Local Obsidian]
   |
   | 8. User uses Claude Code commands for deep work
   v
[Output: Resume, Cover Letter, etc.]
```

---

## 3. Components

### 3.1 Sprite (Cloudflare Worker)

**Location**: `sprite/`

**Stack**: Hono + TypeScript + Wrangler + Workers AI

**Responsibility**:
- Receive Telegram webhook POST
- Queue messages to KV for async processing
- Preprocess: clean text, detect URLs, enrich via Firecrawl
- Classify: call AI Gateway for PARA classification
- Write: GitHub API to create files in PARA folders

**Directory Structure**:
```
sprite/
├── src/
│   ├── index.ts              # Main entry (fetch + scheduled)
│   ├── types.ts              # Core types
│   ├── types/
│   │   └── queue.ts          # Queue message types
│   ├── telegram/
│   │   └── bot.ts            # Bot setup + commands
│   ├── handlers/
│   │   └── capture.ts        # Message extraction
│   ├── processor/
│   │   ├── index.ts          # Scheduled worker entry
│   │   ├── queue.ts          # KV operations
│   │   ├── preprocess.ts     # Text cleaning + Firecrawl
│   │   ├── classify.ts       # AI classification
│   │   └── github.ts         # GitHub API writes
│   ├── prompts/
│   │   └── classify.ts       # Classification prompt
│   └── lib/
│       └── ai-gateway.ts     # AI Gateway client
├── wrangler.jsonc
└── package.json
```

**Environment Variables** (Wrangler):

**Secrets** (use `wrangler secret put`):

| Name | Required | Description |
|------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather |
| `GITHUB_TOKEN` | Yes | PAT with `repo` scope |
| `FIRECRAWL_API_KEY` | Yes | Firecrawl API key |
| `AI_API_KEY` | Yes | AI Gateway authentication key |

**Configuration Variables** (in `wrangler.jsonc`):

| Name | Description |
|------|-------------|
| `REPO_OWNER` | Target vault repo owner |
| `REPO_NAME` | Target vault repo name |
| `CF_ACCOUNT_ID` | Cloudflare account ID |
| `AI_GATEWAY_ID` | AI Gateway ID |
| `AI_MODEL` | AI model name (e.g., `dynamic/sanctum-classifier`) |

**Bindings**:

| Binding | Type | Description |
|---------|------|-------------|
| `INBOX_QUEUE` | KV Namespace | Message queue storage |
| `AI` | Workers AI | LLM inference binding |

**Deployment**:
```bash
cd sprite
bun install

# Configure wrangler.jsonc (add your REPO_OWNER, REPO_NAME, etc.)
bunx wrangler secret put TELEGRAM_BOT_TOKEN
bunx wrangler secret put GITHUB_TOKEN
bunx wrangler secret put FIRECRAWL_API_KEY
bunx wrangler secret put AI_API_KEY

# Deploy
bun run deploy
```

---

### 3.2 Claude Code Commands (Local)

**Location**: Target Vault's `.claude/commands/`

**Purpose**: Deep work tools invoked via `/command` in Claude Code

**Commands**:

| Command | File | Description |
|---------|------|-------------|
| `/generate-resume` | `generate-resume.md` | Generate resume + cover letter from JD |
| `/init-vault` | `init-vault.md` | Initialize PARA directory structure |

**Example: `/generate-resume`**

```markdown
---
description: Generate tailored resume and cover letter from job description
allowed-tools: Read, Write, Glob
argument-hint: [job-file.md]
---

# Generate Resume

Generate a tailored resume and cover letter based on the job description.

## Input
- Job description file: $1

## Templates
- Resume: @Templates/resume-template.md
- Cover Letter: @Templates/cover-letter-template.md

## Instructions
1. Read the job description from $1
2. Extract key requirements and keywords
3. Generate resume tailored to the role
4. Generate cover letter addressing specific requirements
5. Save outputs to `02_Jobs/Generated/`
```

---

### 3.3 Target Vault Structure

```
target-vault/
├── .claude/
│   └── commands/             # Claude Code commands
│       ├── generate-resume.md
│       └── init-vault.md
├── 01_Projects/              # Active projects with deadlines
│   └── {TopicName}/
│       └── {items}.md
├── 02_Areas/                 # Ongoing responsibilities
│   └── {TopicName}/
│       └── {items}.md
├── 02_Jobs/                  # Job hunting workflow
│   ├── {company-role}.md     # Job descriptions
│   └── Generated/            # AI-generated outputs
│       ├── {job}-resume.md
│       └── {job}-cover-letter.md
├── 03_Resources/             # Reference materials
│   └── {TopicName}/
│       └── {items}.md
├── 04_Archive/               # Completed/inactive items
│   └── {items}.md
└── Templates/                # Document templates
    ├── resume-template.md
    └── cover-letter-template.md
```

---

## 4. Configuration

### 4.1 Environment Variables Summary

| Variable | Used By | Description |
|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Sprite | Telegram bot token |
| `GITHUB_TOKEN` | Sprite | GitHub PAT for API writes |
| `FIRECRAWL_API_KEY` | Sprite | URL content extraction |
| `AI_API_KEY` | Sprite | AI Gateway authentication |
| `REPO_OWNER` | Sprite | Target vault owner |
| `REPO_NAME` | Sprite | Target vault repo name |
| `CF_ACCOUNT_ID` | Sprite | Cloudflare account ID |
| `AI_GATEWAY_ID` | Sprite | AI Gateway ID |

### 4.2 Secrets Management

| Context | Storage |
|---------|---------|
| Sprite (Cloudflare) | `bunx wrangler secret put` |
| Local Claude Code | No secrets needed (uses local auth) |

---

## 5. Deployment

### 5.1 Prerequisites Checklist

- [ ] Telegram Bot created via @BotFather
- [ ] GitHub PAT with `repo` scope
- [ ] Cloudflare account (free tier sufficient)
- [ ] Firecrawl API key
- [ ] AI Gateway configured in Cloudflare
- [ ] Target Vault repository exists

### 5.2 Sprite Deployment

```bash
cd sprite
bun install

# Configure wrangler.jsonc with your values:
# - REPO_OWNER: your GitHub username
# - REPO_NAME: your vault repository name
# - CF_ACCOUNT_ID: your Cloudflare account ID
# - AI_GATEWAY_ID: your AI Gateway ID
# - AI_MODEL: model name (e.g., dynamic/sanctum-classifier)

# Set secrets
bunx wrangler secret put TELEGRAM_BOT_TOKEN
bunx wrangler secret put GITHUB_TOKEN
bunx wrangler secret put FIRECRAWL_API_KEY
bunx wrangler secret put AI_API_KEY

# Deploy
bun run deploy

# Set Telegram webhook (replace with your bot token and worker domain)
curl "https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://your-worker-domain/{TOKEN}"
```

### 5.3 Target Vault Setup

1. Clone your Target Vault repository
2. Install the Sanctum Crucible plugin:
   ```bash
   /plugin install https://github.com/royzhu/gatherer.git#subdirectory=crucible
   ```
3. Initialize vault structure:
   ```bash
   /init-vault
   ```
4. Copy templates to `Templates/` if needed:
   ```bash
   mkdir -p Templates
   # Copy template files from crucible/templates/
   ```
5. Commit and push

### 5.4 Local Development

```bash
cd sprite
bun install
bun run dev
```

---

## 6. Migration from v1

If upgrading from v1 (GitHub Actions based):

1. **Deploy Sprite v2** - follows this spec
2. **Remove GitHub Actions**:
   - Delete `.github/workflows/classify-inbox.yml` from Target Vault
   - Delete related secrets (ANTHROPIC_*, SANCTUM_*)
3. **Archive old Inbox items**:
   - Files in `00_Inbox/` are not processed by v2
   - Manually classify or move to `04_Archive/`
4. **Install Claude Code commands**:
   - Copy `.claude/commands/` to Target Vault

---

## 7. Deprecated Components

### 7.1 Crucible (Python)

**Status**: DEPRECATED

The Python processing engine is replaced by:
- Classification → Sprite (Workers AI)
- Resume generation → Claude Code Commands

The `crucible/` directory is retained for reference but not actively maintained.

### 7.2 Rituals (GitHub Actions)

**Status**: DEPRECATED

| File | v1 Purpose | v2 Status |
|------|------------|-----------|
| `classify-inbox.yml` | Batch classification | Replaced by Sprite real-time |
| `claude.yml` | @claude bot | Optional, independent |
| `lint.yml` | PR linting | Optional, independent |

---

## 8. Decisions Log

| Question | Decision | Rationale |
|----------|----------|-----------|
| Classification location | Sprite (edge) | Real-time processing, no GitHub Actions delay |
| Resume generation | Claude Code Command | Local execution, better UX than Actions |
| Python vs Commands | Commands | No runtime dependencies, Claude handles everything |
| Skills vs Commands | Commands | Explicit invocation preferred for file-based tasks |
| `00_Inbox/` folder | Removed | Sprite writes directly to PARA folders |

---

## Appendix A: Classification Prompt

```
You are a PARA classifier. Return JSON only.

Schema:
{
  "items": [
    {
      "index": 0,
      "category": "projects|areas|resources|archives|jobs",
      "topic": "topic-name",
      "summary": "short summary"
    }
  ]
}

Classification Guidelines:
- projects: Active work with deadlines
- areas: Ongoing responsibilities (health, finance, learning)
- resources: Reference materials, articles, tools
- archives: Completed or inactive items
- jobs: Job postings, career opportunities

Output Rules:
- topic: Use the SAME LANGUAGE as the input. Be specific and searchable.
- summary: Use the SAME LANGUAGE as the input. Keep it concise.

Task:
Classify the following messages.
```

---

## Appendix B: Output Format

Messages are saved to PARA folders with frontmatter:

```markdown
---
source: https://example.com
date: 2026-01-07
type: url
category: resources
topic: AI-Tools
---

## AI Summary

Article about new AI productivity tools...

---

[Full extracted content]
```
