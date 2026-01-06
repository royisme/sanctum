import type { CaptureEvent, MarkdownOutput } from '../types'

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