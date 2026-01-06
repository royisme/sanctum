import { describe, it, expect } from 'vitest'
import {
  formatMarkdown,
  formatDailyEntry,
  createDailyFileContent,
  parseDailyFile,
  mergeEntry,
} from './format'
import type { CaptureEvent, InboxEntry } from '../types'

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
})

describe('formatDailyEntry', () => {
  it('generates daily filename', () => {
    const event: CaptureEvent = {
      rawText: 'Test',
      sourceType: 'text',
      sourceUrl: '',
      createdAt: '2024-01-15T10:30:00.000Z',
      tags: [],
      language: '',
    }
    const result = formatDailyEntry(event)

    expect(result.filename).toBe('inbox-2024-01-15.md')
    expect(result.date).toBe('2024-01-15')
  })

  it('extracts correct hour and time', () => {
    const event: CaptureEvent = {
      rawText: 'Test',
      sourceType: 'text',
      sourceUrl: '',
      createdAt: '2024-01-15T14:45:00.000Z',
      tags: [],
      language: '',
    }
    const result = formatDailyEntry(event)

    expect(result.entry.hour).toBe('14:00')
    expect(result.entry.time).toBe('14:45')
  })

  it('includes source info in entry', () => {
    const event: CaptureEvent = {
      rawText: 'Check this link',
      sourceType: 'url',
      sourceUrl: 'https://example.com',
      createdAt: '2024-01-15T10:30:00.000Z',
      tags: [],
      language: '',
    }
    const result = formatDailyEntry(event)

    expect(result.entry.sourceType).toBe('url')
    expect(result.entry.sourceUrl).toBe('https://example.com')
    expect(result.entry.text).toBe('Check this link')
  })
})

describe('createDailyFileContent', () => {
  it('creates file with frontmatter and sections', () => {
    const entries = new Map<string, InboxEntry[]>()
    entries.set('10:00', [
      { time: '10:30', hour: '10:00', text: 'First', sourceType: 'text', sourceUrl: '' },
    ])

    const content = createDailyFileContent('2024-01-15', entries)

    expect(content).toContain('---\ndate: 2024-01-15\n---')
    expect(content).toContain('## 10:00')
    expect(content).toContain('- 10:30 First')
  })

  it('sorts hours chronologically', () => {
    const entries = new Map<string, InboxEntry[]>()
    entries.set('14:00', [
      { time: '14:30', hour: '14:00', text: 'Afternoon', sourceType: 'text', sourceUrl: '' },
    ])
    entries.set('09:00', [
      { time: '09:15', hour: '09:00', text: 'Morning', sourceType: 'text', sourceUrl: '' },
    ])

    const content = createDailyFileContent('2024-01-15', entries)

    const morningIndex = content.indexOf('## 09:00')
    const afternoonIndex = content.indexOf('## 14:00')
    expect(morningIndex).toBeLessThan(afternoonIndex)
  })

  it('includes source URL when present', () => {
    const entries = new Map<string, InboxEntry[]>()
    entries.set('10:00', [
      {
        time: '10:30',
        hour: '10:00',
        text: 'Link',
        sourceType: 'url',
        sourceUrl: 'https://example.com',
      },
    ])

    const content = createDailyFileContent('2024-01-15', entries)

    expect(content).toContain('source: https://example.com')
  })
})

describe('parseDailyFile', () => {
  it('parses entries from daily file', () => {
    const content = `---
date: 2024-01-15
---

## 10:00

- 10:30 Hello world

## 14:00

- 14:45 Afternoon note`

    const entries = parseDailyFile(content)

    expect(entries.size).toBe(2)
    expect(entries.get('10:00')).toHaveLength(1)
    expect(entries.get('10:00')![0].time).toBe('10:30')
    expect(entries.get('10:00')![0].text).toBe('Hello world')
    expect(entries.get('14:00')![0].time).toBe('14:45')
  })

  it('parses source URL', () => {
    const content = `---
date: 2024-01-15
---

## 10:00

- 10:30 Check this
  source: https://example.com`

    const entries = parseDailyFile(content)

    expect(entries.get('10:00')![0].sourceUrl).toBe('https://example.com')
    expect(entries.get('10:00')![0].text).toBe('Check this')
  })
})

describe('mergeEntry', () => {
  it('creates new content when no existing content', () => {
    const output = {
      filename: 'inbox-2024-01-15.md',
      date: '2024-01-15',
      entry: {
        time: '10:30',
        hour: '10:00',
        text: 'First entry',
        sourceType: 'text' as const,
        sourceUrl: '',
      },
    }

    const result = mergeEntry(null, output)

    expect(result).toContain('date: 2024-01-15')
    expect(result).toContain('## 10:00')
    expect(result).toContain('- 10:30 First entry')
  })

  it('appends to existing hour section', () => {
    const existing = `---
date: 2024-01-15
---

## 10:00

- 10:15 Earlier message`

    const output = {
      filename: 'inbox-2024-01-15.md',
      date: '2024-01-15',
      entry: {
        time: '10:45',
        hour: '10:00',
        text: 'Later message',
        sourceType: 'text' as const,
        sourceUrl: '',
      },
    }

    const result = mergeEntry(existing, output)

    expect(result).toContain('- 10:15 Earlier message')
    expect(result).toContain('- 10:45 Later message')
    expect(result.match(/## 10:00/g)).toHaveLength(1)
  })

  it('creates new hour section when needed', () => {
    const existing = `---
date: 2024-01-15
---

## 09:00

- 09:15 Morning`

    const output = {
      filename: 'inbox-2024-01-15.md',
      date: '2024-01-15',
      entry: {
        time: '14:30',
        hour: '14:00',
        text: 'Afternoon',
        sourceType: 'text' as const,
        sourceUrl: '',
      },
    }

    const result = mergeEntry(existing, output)

    expect(result).toContain('## 09:00')
    expect(result).toContain('## 14:00')
    expect(result).toContain('- 14:30 Afternoon')
  })
})
