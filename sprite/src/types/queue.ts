// Queue message types

export interface QueueMessage {
  text: string
  sourceUrl: string
  sourceType: 'url' | 'text' | 'youtube'
  createdAt: string
  userId?: number
}

export interface ProcessedMessage extends QueueMessage {
  enrichedContent?: string // Firecrawl extracted content
  needsEnrichment: boolean
}

export interface ClassificationItem {
  index: number
  category: 'projects' | 'areas' | 'resources' | 'archives' | 'jobs'
  topic: string
  summary: string
}

export interface ClassificationResult {
  items: ClassificationItem[]
}
