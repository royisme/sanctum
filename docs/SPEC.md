# Sanctum System Specification

> Version: 1.0.0-draft
> Last Updated: 2026-01-05
> Status: Draft

## 1. Overview

### 1.1 Purpose

Sanctum (圣所) 是一个"云端采集 + 本地深耕"的知识管理系统：
- 24/7 无人值守的信息捕获 (Telegram Bot)
- 自动化批量分类 (LLM + GitHub Actions)
- 本地深度转化 (Obsidian + Claude Code)

### 1.2 Naming Theme

中古魔幻风格命名体系：

| 组件 | 名称 | 含义 | 职责 |
|------|------|------|------|
| 系统 | **Sanctum** | 圣所 | 魔法师的私密领地 |
| 捕获 | **Sprite** | 精灵 | 轻盈灵动的采集者 |
| 转化 | **Crucible** | 坩埚 | 熔炼原料的容器 |
| 仪式 | **Rituals** | 仪式 | 定期执行的魔法程序 (GitHub Actions 模板) |

**叙事**：
> 精灵 (Sprite) 穿梭于信息之间，捕获碎片带回圣所，
> 投入坩埚 (Crucible) 熔炼，化作可用的知识。

### 1.3 User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-1 | 用户 | 在手机上随手转发文章到 TG Bot | 碎片信息自动归档到 Vault |
| US-2 | 用户 | 系统自动将 Inbox 内容分类到 PARA 目录 | 无需手动整理 |
| US-3 | 用户 | 在本地针对 Job Description 生成简历 | 快速产出求职材料 |

### 1.4 Non-Goals (v1.0)

- 不支持 Web Clipper (未来扩展)
- 不支持多用户
- 不支持实时分类 (采用批量模式)

---

## 2. Architecture

### 2.1 System Diagram

```
+---------------------------------------------------------------------+
|                           SANCTUM SYSTEM                            |
+---------------------------------------------------------------------+
|                                                                     |
|   CAPTURE LAYER                  PROCESS LAYER                      |
|   +----------------+            +-----------------------------+     |
|   | SPRITE         |            | CRUCIBLE                    |     |
|   | (CF Worker)    |            | (GitHub Actions + Python)   |     |
|   |                |            |                             |     |
|   | Runtime: Edge  |            | Runtime: ubuntu-latest      |     |
|   | Stack: Hono +  |            | Stack: Python 3.12 + uv     |     |
|   |   Vite + TS    |            |                             |     |
|   | Trigger: HTTP  |            | Trigger: cron / manual      |     |
|   +-------+--------+            +--------------+--------------+     |
|           |                                    |                    |
|           | GitHub API                         | git clone/push     |
|           | (create file)                      |                    |
|           v                                    v                    |
|   +-----------------------------------------------------------------+
|   |                   TARGET VAULT (GitHub Repo)                    |
|   |                                                                 |
|   |   00_Inbox/          01_Projects/       Templates/              |
|   |   +-- item-1.md  --> +-- ProjectA/      +-- resume.md           |
|   |   +-- item-2.md      |   +-- Index.md   +-- cover-letter.md     |
|   |   +-- _failed/       02_Areas/                                  |
|   |                      02_Jobs/                                   |
|   |                      03_Resources/                              |
|   |                      04_Archive/                                |
|   +-----------------------------------------------------------------+
|                                    |                                |
|                                    | git pull (Obsidian Git)        |
|                                    v                                |
|   SYNTHESIS LAYER                                                   |
|   +-----------------------------------------------------------------+
|   |              LOCAL WORKSTATION                                  |
|   |                                                                 |
|   |   Obsidian ----------> Claude Code / Crucible CLI               |
|   |   (view/edit)          (generate_resume.py interactive tasks)   |
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
   | 2. Parse message, format as Markdown
   | 3. GitHub API: PUT /repos/{owner}/{repo}/contents/00_Inbox/{filename}.md
   v
[Target Vault - 00_Inbox/]
   |
   | 4. GitHub Actions (cron: every 12h)
   |    - Clone vault
   |    - Run crucible/llm/classify_inbox.py
   |    - Commit & Push
   v
[Target Vault - PARA folders]
   |
   | 5. Obsidian Git plugin pulls changes
   v
[Local Obsidian]
   |
   | 6. User reviews, triggers local tools (optional)
   v
[Output: Resume, Cover Letter, etc.]
```

---

## 3. Components

### 3.1 Sprite (Cloudflare Worker)

**Location**: `sprite/`

**Stack**: Hono + Vite + TypeScript + Wrangler

**Responsibility**:
- Receive Telegram webhook POST
- Validate bot token
- Extract text, URLs, metadata from message
- Format as Markdown with YAML frontmatter
- Write to Target Vault via GitHub API

**Directory Structure**:
```
sprite/
+-- src/
|   +-- index.tsx          # Hono app entry
+-- public/
+-- wrangler.jsonc         # CF config
+-- package.json           # bun dependencies
+-- vite.config.ts
+-- tsconfig.json
```

**Input**:
```json
{
  "message": {
    "text": "https://example.com/article interesting read",
    "entities": [{"type": "url", "offset": 0, "length": 23}]
  }
}
```

**Output** (written to `00_Inbox/inbox-2026-01-05T12-00-00.md`):
```markdown
---
source-type: "url"
source-url: "https://example.com/article"
created-at: "2026-01-05T12:00:00.000Z"
tags: []
language: ""
---

# Inbox Item

https://example.com/article interesting read
```

**Environment Variables** (Wrangler Secrets):

| Name | Required | Description |
|------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather |
| `GITHUB_TOKEN` | Yes | PAT with `repo` scope |
| `REPO_OWNER` | Yes | Target vault repo owner |
| `REPO_NAME` | Yes | Target vault repo name |

**Deployment**:
```bash
cd sprite
bun install
bun run deploy
```

---

### 3.2 Crucible (Python Processing Engine)

**Location**: `crucible/`

**Stack**: Python 3.12 + uv + anthropic SDK

**SDK Strategy**:
- 当前使用 `anthropic` 标准 SDK (简单 completion)
- 未来可升级到 `claude-agent-sdk` (Agentic 任务，需要时引入)

**Responsibility**:
- Batch classification of Inbox items
- Resume and cover letter generation
- Vault initialization

**Directory Structure**:
```
crucible/
+-- llm/
|   +-- __init__.py
|   +-- classify_inbox.py   # Main classifier
+-- jobs/
|   +-- __init__.py
|   +-- generate_resume.py  # Resume generator
+-- init_vault.py           # Vault structure init
+-- pyproject.toml          # uv dependencies
```

**Runtime Contexts**:

| Context | Trigger | Description |
|---------|---------|-------------|
| GitHub Actions | cron / manual | Batch classification |
| Local CLI | user invocation | Resume generation, testing |

**LLM Classification Schema**:

Input:
```json
[
  {"path": "00_Inbox/item-1.md", "content": "...truncated to 4000 chars..."}
]
```

Output:
```json
{
  "items": [
    {
      "path": "00_Inbox/item-1.md",
      "category": "resources",
      "topic": "AI-Tools",
      "summary": "Collection of AI productivity tools"
    }
  ]
}
```

**Category Mapping**:

| LLM Output | Target Directory |
|------------|------------------|
| `projects` | `01_Projects/` |
| `areas` | `02_Areas/` |
| `resources` | `03_Resources/` |
| `archives` | `04_Archive/` |
| `jobs` | `02_Jobs/` |

**Error Handling**:
- Classification failure: move to `00_Inbox/_failed/`
- Retry on next scheduled run

**Environment Variables**:

| Name | Required | Description |
|------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Customize Anthropic API key (SDK auto-reads) |
| `ANTHROPIC_BASE_URL` | Yes |Customize Anthropic URL  (SDK auto-reads) |
| `VAULT_PATH` | Yes | Path to cloned/local vault |

---

### 3.3 Rituals (GitHub Actions Templates)

**Location**: `rituals/`

**Purpose**: Workflow templates to be copied to Target Vault's `.github/workflows/`

**Files**:
- `classify-inbox.yml` - 定时分类仪式
- `claude.yml` - @claude 触发的代码助手
- `lint.yml` - PR/Push lint 检查

**Usage**:
```bash
cp sanctum/rituals/classify-inbox.yml my-vault/.github/workflows/
```

---

### 3.4 Templates

**Location**: `Templates/` (in sanctum repo)

Templates are stored in the sanctum repository and used by crucible scripts.

**Files**:
- `resume-template.md` - Resume structure
- `cover-letter-template.md` - Cover letter structure

---

## 4. Target Vault Structure

### 4.1 Directory Layout

```
target-vault/
+-- 00_Inbox/                    # Sprite writes here
|   +-- _template.md             # (ignored by classifier)
|   +-- _failed/                 # Classification failures
|   +-- inbox-{timestamp}.md     # Captured items
+-- 01_Projects/                 # Active projects with deadlines
|   +-- {TopicName}/
|       +-- Index.md             # MOC (auto-generated)
|       +-- {classified-items}.md
+-- 02_Areas/                    # Ongoing responsibilities
|   +-- {TopicName}/
|       +-- ...
+-- 02_Jobs/                     # Job hunting workflow
|   +-- {company-role}.md        # Job descriptions
|   +-- Generated/               # AI-generated outputs
|       +-- {job}-resume.md
|       +-- {job}-cover-letter.md
+-- 03_Resources/                # Reference materials
|   +-- {TopicName}/
|       +-- ...
+-- 04_Archive/                  # Completed/inactive items
|   +-- ...
+-- Templates/                   # User templates (optional override)
    +-- resume-template.md
    +-- cover-letter-template.md
```

### 4.2 Initialization (Fallback)

If Target Vault does not have required directories, `crucible/init_vault.py` creates them:

```python
REQUIRED_DIRS = [
    "00_Inbox",
    "00_Inbox/_failed",
    "01_Projects",
    "02_Areas",
    "03_Resources/01_Jobs",
    "03_Resources/01_JobsGenerated",
    "03_Resources",
    "04_Archive",
]
```

---

## 5. Configuration

### 5.1 Environment Variables Summary

| Variable | Used By | Description |
|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Sprite | Telegram bot token |
| `GITHUB_TOKEN` | Sprite | GitHub PAT for API writes |
| `REPO_OWNER` | Sprite | Target vault owner |
| `REPO_NAME` | Sprite | Target vault repo name |
| `ANTHROPIC_API_KEY` | Crucible | Customize Anthropic API key ) |
| `ANTHROPIC_BASE_URL` | Crucible |Customize Anthropic URL | 
| `VAULT_PATH` | Crucible | Path to cloned vault |
| `JOB_PATH` | Crucible | Path to job description file |

### 5.2 Secrets Management

| Context | Storage |
|---------|---------|
| Sprite (Cloudflare) | `wrangler secret put` |
| GitHub Actions | Repository secrets (Target Vault repo) |
| Local development | `.env` file (gitignored) |

---

## 6. Deployment

### 6.1 Prerequisites Checklist

- [ ] Telegram Bot created via @BotFather
- [ ] GitHub PAT with `repo` scope
- [ ] Cloudflare account (free tier sufficient)
- [ ] LLM API key (Claude or OpenAI)
- [ ] Target Vault repository exists

### 6.2 Sprite Deployment (Cloudflare Worker)

```bash
cd sprite

# Install dependencies
bun install

# Login to Cloudflare
bunx wrangler login

# Set secrets
bunx wrangler secret put TELEGRAM_BOT_TOKEN
bunx wrangler secret put GITHUB_TOKEN
bunx wrangler secret put REPO_OWNER
bunx wrangler secret put REPO_NAME

# Deploy
bun run deploy

# Set Telegram webhook
curl "https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://sprite.{account}.workers.dev/{TOKEN}"
```

### 6.3 GitHub Actions Setup (Target Vault Repo)

1. Navigate to Target Vault repo Settings > Secrets
2. Add secrets:
   - `ANTHROPIC_API_KEY`
   - `SANCTUM_REPO` (owner/sanctum format, for fetching crucible)

3. Copy ritual to Target Vault:
   ```bash
   cp sanctum/rituals/classify-inbox.yml my-vault/.github/workflows/
   ```

### 6.4 Local Development

```bash
cd sanctum/crucible

# Setup Python environment
uv venv
uv pip install -e .

# Create .env file
cp ../.env.example .env
# Edit .env with your values

# Run classifier locally (for testing)
VAULT_PATH=/path/to/vault uv run python -m crucible.llm.classify_inbox

# Run resume generator
JOB_PATH=/path/to/vault/02_Jobs/company-role.md \
VAULT_PATH=/path/to/vault \
uv run python -m crucible.jobs.generate_resume
```

---

## 7. File Inventory

| Path | Type | Runtime | Status |
|------|------|---------|--------|
| `sprite/src/index.tsx` | TypeScript | CF Edge | Exists (stub) |
| `sprite/wrangler.jsonc` | Config | - | Exists |
| `sprite/package.json` | Config | - | Exists |
| `crucible/llm/classify_inbox.py` | Python | GH Actions / Local | Needs refactor (use anthropic SDK) |
| `crucible/jobs/generate_resume.py` | Python | Local only | Needs refactor (use anthropic SDK) |
| `crucible/init_vault.py` | Python | GH Actions / Local | Missing |
| `crucible/pyproject.toml` | Config | - | Needs update (anthropic dependency) |
| `rituals/classify-inbox.yml` | YAML | GitHub Actions | Exists |
| `rituals/claude.yml` | YAML | GitHub Actions | Exists |
| `rituals/lint.yml` | YAML | GitHub Actions | Exists |
| `Templates/resume-template.md` | Markdown | - | Exists |
| `Templates/cover-letter-template.md` | Markdown | - | Exists |
| `.env.example` | Config | - | Missing |
| `docs/SPEC.md` | Doc | - | This document |

---

## 8. Decisions (Resolved)

| Question | Decision | Rationale |
|----------|----------|-----------|
| Templates 位置 | Sanctum 仓库 | 代码与模板同仓库，便于版本管理 |
| GitHub Actions 位置 | Target Vault 仓库 (从 rituals/ 复制) | 简化实现，直接访问文件 |
| 分类失败处理 | 移动到 `00_Inbox/_failed/` | 隔离失败项，不阻塞后续处理 |
| LLM SDK | Crucible 用 `anthropic` Python SDK | 简单 completion 足够，未来可升级 Agent SDK |
| Sprite LLM | 当前不调用 LLM | 保持轻量，如需可用 `@anthropic-ai/sdk` (edge 兼容) |
| 技术栈分离 | Sprite (TS/Edge) 与 Crucible (Python/Node) 独立 | 运行环境不同，无共享代码可能 |

---

## 9. SDK Strategy

### 9.1 Runtime Constraints

| 组件 | 运行环境 | 可用 SDK |
|------|----------|----------|
| Sprite | Cloudflare Workers (Edge) | `@anthropic-ai/sdk` (轻量，edge 兼容) |
| Crucible | GitHub Actions / Local (Python 3.12 + uv) | `anthropic` 或 `claude-agent-sdk` (Python) |

### 9.2 Current Choice

- **Sprite**: 当前不调用 LLM，保持纯捕获功能
- **Crucible**: 使用 `anthropic` 标准 Python SDK

### 9.3 Future Upgrade Path

当需要 Agentic 能力时 (工具调用、多轮对话、文件读写)：
- Crucible 可引入 `claude-agent-sdk` (Python)
- 支持 `Read`, `Edit`, `Bash`, `WebSearch` 等内置工具

---

## Appendix A: Markdown Frontmatter Schema

```yaml
---
source-type: "url" | "text" | "forward"  # 来源类型
source-url: ""                            # 原始 URL (如有)
created-at: "ISO8601"                     # 捕获时间
tags: []                                  # 用户标签 (可选)
language: ""                              # 内容语言 (可选)
ai-category: ""                           # LLM 分类结果 (分类后填充)
ai-summary: ""                            # LLM 摘要 (分类后填充)
---
```

---

## Appendix B: LLM Prompt Templates

### Classification Prompt

```
You are a classifier. Return JSON only.
Schema: {
  "items": [
    {
      "path": "...",
      "category": "projects|areas|resources|archives|jobs",
      "topic": "topic-name",
      "summary": "short summary"
    }
  ]
}
Content:
[{...}]
```

### Resume Generation Prompt

```
You are a career assistant. Return JSON only.
Schema: {
  "resume": "filled markdown",
  "cover_letter": "filled markdown"
}
Content:
{...}
```
