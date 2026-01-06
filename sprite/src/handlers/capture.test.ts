import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCaptureHandler } from './capture'
import type { Context } from 'grammy'

function createMockContext(message: unknown): Context {
  return { message } as Context
}

describe('createCaptureHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:30:00.000Z'))
  })

  it('returns null when message is undefined', async () => {
    const handler = createCaptureHandler()
    const ctx = createMockContext(undefined)
    const result = await handler(ctx)
    expect(result).toBeNull()
  })

  it('returns null when message has no text', async () => {
    const handler = createCaptureHandler()
    const ctx = createMockContext({ photo: [] })
    const result = await handler(ctx)
    expect(result).toBeNull()
  })

  it('extracts text-only message correctly', async () => {
    const handler = createCaptureHandler()
    const ctx = createMockContext({
      text: 'Hello world',
      entities: [],
    })
    const result = await handler(ctx)

    expect(result).toEqual({
      rawText: 'Hello world',
      sourceType: 'text',
      sourceUrl: '',
      createdAt: '2024-01-15T10:30:00.000Z',
      tags: [],
      language: '',
    })
  })

  it('extracts URL from url entity using offset/length', async () => {
    const handler = createCaptureHandler()
    const ctx = createMockContext({
      text: 'Check this https://example.com/page out',
      entities: [
        { type: 'url', offset: 11, length: 24 },
      ],
    })
    const result = await handler(ctx)

    expect(result).toEqual({
      rawText: 'Check this https://example.com/page out',
      sourceType: 'url',
      sourceUrl: 'https://example.com/page',
      createdAt: '2024-01-15T10:30:00.000Z',
      tags: [],
      language: '',
    })
  })

  it('extracts URL from text_link entity', async () => {
    const handler = createCaptureHandler()
    const ctx = createMockContext({
      text: 'Click here for more',
      entities: [
        { type: 'text_link', offset: 0, length: 10, url: 'https://linked.com' },
      ],
    })
    const result = await handler(ctx)

    expect(result).toEqual({
      rawText: 'Click here for more',
      sourceType: 'url',
      sourceUrl: 'https://linked.com',
      createdAt: '2024-01-15T10:30:00.000Z',
      tags: [],
      language: '',
    })
  })

  it('handles Chinese text correctly', async () => {
    const handler = createCaptureHandler()
    const ctx = createMockContext({
      text: '你好世界',
      entities: [],
    })
    const result = await handler(ctx)

    expect(result).toEqual({
      rawText: '你好世界',
      sourceType: 'text',
      sourceUrl: '',
      createdAt: '2024-01-15T10:30:00.000Z',
      tags: [],
      language: '',
    })
  })
})
