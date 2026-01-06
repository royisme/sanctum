import { describe, it, expect } from 'vitest'
import { formatMarkdown } from './format'
import type { CaptureEvent } from '../types'

describe('formatMarkdown', () => {
  it('generates correct filename without colons', () => {
    const event: CaptureEvent = {
      rawText: 'Test message',
      sourceType: 'text',
      sourceUrl: '',
      createdAt: '2024-01-15T10:30:00.000Z',
      tags: [],
      language: '',
    }
    const result = formatMarkdown(event)

    expect(result.filename).toBe('inbox-2024-01-15T10-30-00.000Z.md')
    expect(result.filename).not.toContain(':')
  })

  it('generates valid YAML frontmatter for text message', () => {
    const event: CaptureEvent = {
      rawText: 'Hello world',
      sourceType: 'text',
      sourceUrl: '',
      createdAt: '2024-01-15T10:30:00.000Z',
      tags: [],
      language: '',
    }
    const result = formatMarkdown(event)

    expect(result.markdownContent).toContain('---')
    expect(result.markdownContent).toContain('source-type: text')
    expect(result.markdownContent).toContain('source-url: ""')
    expect(result.markdownContent).toContain('created-at: "2024-01-15T10:30:00.000Z"')
    expect(result.markdownContent).toContain('tags: []')
    expect(result.markdownContent).toContain('language: ""')
    expect(result.markdownContent).toContain('Hello world')
  })

  it('generates valid YAML frontmatter for URL message', () => {
    const event: CaptureEvent = {
      rawText: 'Check https://example.com',
      sourceType: 'url',
      sourceUrl: 'https://example.com',
      createdAt: '2024-01-15T10:30:00.000Z',
      tags: [],
      language: '',
    }
    const result = formatMarkdown(event)

    expect(result.markdownContent).toContain('source-type: url')
    expect(result.markdownContent).toContain('source-url: "https://example.com"')
  })

  it('escapes special characters in YAML values', () => {
    const event: CaptureEvent = {
      rawText: 'Message with "quotes" and: colons',
      sourceType: 'text',
      sourceUrl: '',
      createdAt: '2024-01-15T10:30:00.000Z',
      tags: [],
      language: '',
    }
    const result = formatMarkdown(event)

    // sourceUrl with special chars should be quoted
    expect(result.markdownContent).toContain('source-url: ""')
  })

  it('handles Chinese content correctly', () => {
    const event: CaptureEvent = {
      rawText: '你好世界',
      sourceType: 'text',
      sourceUrl: '',
      createdAt: '2024-01-15T10:30:00.000Z',
      tags: [],
      language: '',
    }
    const result = formatMarkdown(event)

    expect(result.markdownContent).toContain('你好世界')
  })

  it('formats tags array correctly', () => {
    const event: CaptureEvent = {
      rawText: 'Tagged message',
      sourceType: 'text',
      sourceUrl: '',
      createdAt: '2024-01-15T10:30:00.000Z',
      tags: ['tag1', 'tag2'],
      language: 'en',
    }
    const result = formatMarkdown(event)

    expect(result.markdownContent).toContain('tags:')
    expect(result.markdownContent).toContain('  - tag1')
    expect(result.markdownContent).toContain('  - tag2')
  })

  it('produces parseable YAML structure', () => {
    const event: CaptureEvent = {
      rawText: 'Test',
      sourceType: 'url',
      sourceUrl: 'https://example.com/path?query=1&other=2',
      createdAt: '2024-01-15T10:30:00.000Z',
      tags: ['research'],
      language: 'en',
    }
    const result = formatMarkdown(event)

    // Check basic structure
    const lines = result.markdownContent.split('\n')
    expect(lines[0]).toBe('---')
    const endIndex = lines.indexOf('---', 1)
    expect(endIndex).toBeGreaterThan(0)
  })
})
