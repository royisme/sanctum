import type { CaptureEvent, MarkdownOutput, DailyFileOutput, InboxEntry } from '../types'

function escapeYamlString(value: string): string {
  if (!value) return '""'
  if (/[:\[\]{}&*?|>!%#@`'",\n]/.test(value) || value.startsWith(' ') || value.endsWith(' ')) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
  }
  return value
}

function formatYamlValue(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return value.map((v) => `\n  - ${escapeYamlString(String(v))}`).join('')
  }
  if (typeof value === 'string') {
    return escapeYamlString(value)
  }
  return String(value)
}

export function formatMarkdown(event: CaptureEvent): MarkdownOutput {
  const timestamp = event.createdAt.replace(/:/g, '-')
  const filename = `inbox-${timestamp}.md`

  const frontmatter = {
    'source-type': event.sourceType,
    'source-url': event.sourceUrl,
    'created-at': event.createdAt,
    tags: event.tags,
    language: event.language,
  }

  const yamlContent = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${formatYamlValue(value)}`)
    .join('\n')

  const markdownContent = `---\n${yamlContent}\n---\n\n${event.rawText}`

  return {
    filename,
    markdownContent,
  }
}

export function formatDailyEntry(event: CaptureEvent): DailyFileOutput {
  const date = new Date(event.createdAt)
  const dateStr = event.createdAt.slice(0, 10)
  const hour = `${String(date.getUTCHours()).padStart(2, '0')}:00`
  const time = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`

  const entry: InboxEntry = {
    time,
    hour,
    text: event.rawText,
    sourceType: event.sourceType,
    sourceUrl: event.sourceUrl,
  }

  return {
    filename: `inbox-${dateStr}.md`,
    date: dateStr,
    entry,
  }
}

export function createDailyFileContent(date: string, entries: Map<string, InboxEntry[]>): string {
  const frontmatter = `---\ndate: ${date}\n---\n`

  const sortedHours = Array.from(entries.keys()).sort()
  const sections = sortedHours.map((hour) => {
    const hourEntries = entries.get(hour)!
    const lines = hourEntries.map((e) => {
      const urlPart = e.sourceUrl ? `\n  source: ${e.sourceUrl}` : ''
      return `- ${e.time} ${e.text}${urlPart}`
    })
    return `\n## ${hour}\n\n${lines.join('\n\n')}`
  })

  return frontmatter + sections.join('\n')
}

export function parseDailyFile(content: string): Map<string, InboxEntry[]> {
  const entries = new Map<string, InboxEntry[]>()

  const hourSectionRegex = /^## (\d{2}:00)$/gm
  const sections = content.split(hourSectionRegex)

  for (let i = 1; i < sections.length; i += 2) {
    const hour = sections[i]
    const sectionContent = sections[i + 1] || ''

    const entryRegex = /^- (\d{2}:\d{2}) ([\s\S]*?)(?=\n- \d{2}:\d{2} |\n## |\n*$)/gm
    const hourEntries: InboxEntry[] = []

    let match
    while ((match = entryRegex.exec(sectionContent)) !== null) {
      const time = match[1]
      let text = match[2].trim()
      let sourceUrl = ''

      const sourceMatch = text.match(/\n\s*source:\s*(.+)$/)
      if (sourceMatch) {
        sourceUrl = sourceMatch[1].trim()
        text = text.replace(/\n\s*source:\s*.+$/, '').trim()
      }

      hourEntries.push({
        time,
        hour,
        text,
        sourceType: sourceUrl ? 'url' : 'text',
        sourceUrl,
      })
    }

    if (hourEntries.length > 0) {
      entries.set(hour, hourEntries)
    }
  }

  return entries
}

export function mergeEntry(
  existingContent: string | null,
  newOutput: DailyFileOutput
): string {
  const entries = existingContent ? parseDailyFile(existingContent) : new Map<string, InboxEntry[]>()

  const hourEntries = entries.get(newOutput.entry.hour) || []
  hourEntries.push(newOutput.entry)
  entries.set(newOutput.entry.hour, hourEntries)

  return createDailyFileContent(newOutput.date, entries)
}