export interface Env {
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_WEBHOOK_SECRET_TOKEN?: string
  GITHUB_TOKEN: string
  REPO_OWNER: string
  REPO_NAME: string
}

export type HonoEnv = {
 Bindings: Env
}

export interface CaptureEvent {
  rawText: string
  sourceType: 'url' | 'text'
  sourceUrl: string
  createdAt: string
  tags: string[]
  language: string
}

export interface MarkdownOutput {
  filename: string
  markdownContent: string
}