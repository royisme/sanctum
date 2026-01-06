import { type Context } from 'grammy'
import type { CaptureEvent } from '../types'

export function createCaptureHandler() {
  return async (ctx: Context): Promise<CaptureEvent | null> => {
    const message = ctx.message

    if (!message || !('text' in message) || !message.text) {
      return null
    }

    const rawText: string = message.text
    let sourceUrl = ''
    let sourceType: 'url' | 'text' = 'text'

    // Check for URL entities
    if (message.entities) {
      const urlEntity = message.entities.find(
        (e) => e.type === 'url' || e.type === 'text_link',
      )
      if (urlEntity) {
        sourceType = 'url'
        if ('url' in urlEntity && urlEntity.url) {
          sourceUrl = urlEntity.url
        } else if (urlEntity.type === 'url') {
          sourceUrl = rawText.substring(
            urlEntity.offset,
            urlEntity.offset + urlEntity.length,
          )
        }
      }
    }

    // Also check caption entities for messages with media
    if (!sourceUrl && message.caption_entities) {
      const urlEntity = message.caption_entities.find(
        (e) => e.type === 'url' || e.type === 'text_link',
      )
      if (urlEntity) {
        sourceType = 'url'
        if ('url' in urlEntity && urlEntity.url) {
          sourceUrl = urlEntity.url
        } else if (urlEntity.type === 'url') {
          const caption = message.caption || ''
          sourceUrl = caption.substring(
            urlEntity.offset,
            urlEntity.offset + urlEntity.length,
          )
        }
      }
    }

    return {
      rawText,
      sourceType,
      sourceUrl,
      createdAt: new Date().toISOString(),
      tags: [],
      language: '',
    }
  }
}
