import type { QueueMessage, ProcessedMessage } from '../types/queue'

const URL_PREFIX_PATTERN = /^(链接[：:]\s*|link[：:]\s*)/i

export function cleanText(text: string): string {
  return text.replace(URL_PREFIX_PATTERN, '').trim()
}

export function detectUrlType(url: string): 'youtube' | 'normal' {
  if (!url) return 'normal'
  return /youtube\.com|youtu\.be/i.test(url) ? 'youtube' : 'normal'
}

export async function enrichUrl(url: string, env: Env): Promise<string | null> {
  if (!url || !env.FIRECRAWL_API_KEY) return null

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    })

    if (!response.ok) {
      console.error('Firecrawl API error:', response.status)
      return null
    }

    const data = await response.json()
    return data.data?.markdown || null
  } catch (error) {
    console.error('Firecrawl enrichment failed:', error)
    return null
  }
}

export function preprocessMessage(msg: QueueMessage): ProcessedMessage {
  let text = cleanText(msg.text)

  if (msg.sourceUrl) {
    text = text.replace(msg.sourceUrl, '').trim()
  }

  const needsEnrichment = !text && !!msg.sourceUrl
  const urlType = detectUrlType(msg.sourceUrl)

  return {
    ...msg,
    text: text || msg.sourceUrl,
    sourceType: msg.sourceUrl ? urlType : 'text',
    needsEnrichment,
  }
}

export async function preprocessBatch(
  messages: Array<{ key: string; data: QueueMessage }>,
  env: Env,
): Promise<ProcessedMessage[]> {
  const processed = messages.map((m) => preprocessMessage(m.data))

  const enriched = await Promise.all(
    processed.map(async (msg) => {
      if (msg.needsEnrichment && msg.sourceUrl && msg.sourceType !== 'youtube') {
        const content = await enrichUrl(msg.sourceUrl, env)
        if (content) {
          return {
            ...msg,
            text: content,
            enrichedContent: content,
            needsEnrichment: false,
          }
        }
      }
      return msg
    }),
  )

  return enriched
}
