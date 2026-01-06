# Sanctum Gatherer

Sanctum (圣所) 是一个 "云端采集 + 本地深耕" 的知识工作流系统:
- Sprite 在云端接收 Telegram 消息, 以 Markdown 形式写入你的 GitHub Vault.
- Crucible 在 GitHub Actions 或本地批量处理 Vault 内容 (分类, 生成求职材料等).

本仓库是 Sanctum 的实现组件仓库. 你的知识库本体建议是一个独立的 GitHub Repo (下文称 "Target Vault").

## 目录结构

```
.
├── sprite/    # Capture layer: Cloudflare Worker (Hono + grammY)
├── crucible/  # Process layer: Python 3.12 + uv + anthropic
├── rituals/   # GitHub Actions templates (copy into Target Vault)
└── docs/      # SPEC 和任务拆解
```

相关文档:
- `docs/SPEC.md`
- `docs/tasks/`
- `sprite/README.md`
- `crucible/README.md`

## 组件概览

- Sprite (`sprite/`): Telegram webhook bot (Cloudflare Workers). 把消息落盘到 Target Vault 的 `00_Inbox/`.
- Crucible (`crucible/`): Python 处理引擎. 核心是批量把 `00_Inbox/` 分类到 PARA 目录, 并生成 MOC `Index.md`.
- Rituals (`rituals/`): 工作流模板. 复制到 Target Vault 的 `.github/workflows/` 后定时运行 Crucible.

## Prerequisites

- 一个 GitHub 仓库作为 Target Vault (你的 Obsidian Vault).
- Telegram Bot Token (来自 @BotFather).
- Cloudflare 账号 (用于部署 Sprite).
- Anthropic 兼容的 API 访问 (用于 Crucible 分类与生成):
  - `ANTHROPIC_API_KEY`
  - `ANTHROPIC_BASE_URL`
  - `ANTHROPIC_MODEL`
- 本地开发工具:
  - JavaScript: `bun`
  - Python: `uv`

## Quick Start (面向 Target Vault)

高层步骤:
1. 部署 Sprite, 把 Telegram 消息写入 Target Vault 的 `00_Inbox/`.
2. 在 Target Vault 配置 Rituals 工作流, 定时运行 Crucible 进行批量分类.

## Sprite (Telegram Capture Bot)

Sprite 的职责是 "捕获". v1 不做 LLM 调用, 只负责把输入变成可追溯的 Markdown 文件.

### 环境变量 (Cloudflare Secrets)

使用 `bunx wrangler secret put` 设置:
- Required:
  - `TELEGRAM_BOT_TOKEN`
  - `GITHUB_TOKEN` (需要有写入 Target Vault Repo 的权限)
  - `REPO_OWNER` (Target Vault owner)
  - `REPO_NAME` (Target Vault repo name)
- Optional:
  - `TELEGRAM_WEBHOOK_SECRET_TOKEN` (Telegram 的 `secret_token`)

### 本地开发

```bash
cd sprite
bun install
bun run dev
```

### 部署

```bash
cd sprite
bun install
bun run deploy
```

### 设置 Telegram Webhook

Sprite 的 webhook 路径契约是:
- `POST /<TELEGRAM_BOT_TOKEN>`

示例 (需要替换成你的 Worker 域名和 bot token):

```bash
curl -F "url=https://your-worker-domain.example/<TELEGRAM_BOT_TOKEN>" \
  "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook"
```

更多细节见 `sprite/README.md`.

## Crucible (Python Processing Engine)

Crucible 的职责是 "转化".

### 配置 (环境变量)

Crucible 运行需要:
- `VAULT_PATH`: Target Vault 在本地的路径 (GitHub Actions 中一般是 `${{ github.workspace }}`).
- LLM 相关 (必须显式提供并被 Crucible 使用):
  - `ANTHROPIC_API_KEY`
  - `ANTHROPIC_BASE_URL`
  - `ANTHROPIC_MODEL`

### 本地安装与运行

```bash
cd crucible
uv venv
uv pip install -e ".[dev]"

# 初始化 Vault 目录结构 (可重复运行)
VAULT_PATH=/path/to/your/vault uv run python -m crucible.init_vault

# 批量分类 00_Inbox
ANTHROPIC_API_KEY=... \
ANTHROPIC_BASE_URL=... \
ANTHROPIC_MODEL=... \
VAULT_PATH=/path/to/your/vault \
uv run python -m crucible.llm.classify_inbox
```

### 运行测试

```bash
cd crucible
uv run pytest
```

更多细节见 `crucible/README.md`.

## Rituals (GitHub Actions Templates)

Rituals 需要复制到 Target Vault 仓库, 并在 Target Vault 中配置变量和 secrets.

### 1. 复制工作流到 Target Vault

在 Target Vault 仓库里创建 `.github/workflows/`, 然后复制:
- `rituals/classify-inbox.yml` -> `.github/workflows/classify-inbox.yml`

### 2. Target Vault 配置项

GitHub Actions Variables (推荐):
- `SANCTUM_REPO`: `<owner>/<repo>` (这个 sanctum 组件仓库)
- `SANCTUM_SHA`: 固定的 commit SHA (用于可复现安装 Crucible)

GitHub Actions Secrets:
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_MODEL`

工作流会使用如下命令安装 Crucible (注意 pinned SHA):

```bash
uv pip install "crucible @ git+https://github.com/${{ vars.SANCTUM_REPO }}.git@${{ vars.SANCTUM_SHA }}#subdirectory=crucible"
```

## 安全与惯例

- 不要把任何 token 或 key 写进仓库文件. Sprite 使用 Cloudflare secrets, Rituals 使用 GitHub secrets.
- `00_Inbox/` 中以 `_` 开头的 Markdown 文件会被 Crucible 忽略.
- LLM 调用失败时, Crucible 会把当次 `00_Inbox/` 项移动到 `00_Inbox/_failed/` 并以非 0 退出码结束, 以便工作流显式失败.
