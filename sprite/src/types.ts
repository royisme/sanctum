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

export interface InboxEntry {
  time: string
  hour: string
  text: string
  sourceType: 'url' | 'text'
  sourceUrl: string
}

export interface DailyFileOutput {
  filename: string
  date: string
  entry: InboxEntry
}
