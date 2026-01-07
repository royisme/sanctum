import type { ProcessedMessage, ClassificationItem } from '../types/queue'

interface GitHubFileContent {
  path: string
  content: string
  message: string
}

const CATEGORY_DIRS: Record<string, string> = {
  projects: '01_Projects',
  areas: '02_Areas',
  resources: '03_Resources',
  archives: '04_Archive',
  jobs: '02_Jobs',
}

function sanitizeTopic(topic: string): string {
  const clean = topic.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim()
  return clean.substring(0, 80) || 'Misc'
}

function formatMarkdown(
  msg: ProcessedMessage,
  classification: ClassificationItem,
): string {
  const frontmatter = [
    '---',
    `source: ${msg.sourceUrl || 'text'}`,
    `date: ${new Date(msg.createdAt).toISOString().split('T')[0]}`,
    `type: ${msg.sourceType}`,
    `category: ${classification.category}`,
    `topic: ${classification.topic}`,
    '---',
    '',
  ].join('\n')

  const summary = classification.summary
    ? `## AI Summary\n\n${classification.summary}\n\n---\n\n`
    : ''

  return frontmatter + summary + msg.text
}

function generateFilename(msg: ProcessedMessage): string {
  const date = new Date(msg.createdAt).toISOString().split('T')[0]
  const time = new Date(msg.createdAt)
    .toISOString()
    .split('T')[1]
    .split('.')[0]
    .replace(/:/g, '-')
  return `${date}-${time}.md`
}

export async function writeClassifiedToGitHub(
  messages: ProcessedMessage[],
  classifications: ClassificationItem[],
  env: Env,
): Promise<void> {
  const files: GitHubFileContent[] = []

  for (const item of classifications) {
    const msg = messages[item.index]
    if (!msg) continue

    const categoryDir = CATEGORY_DIRS[item.category]
    if (!categoryDir) {
      console.warn(`Unknown category: ${item.category}`)
      continue
    }

    const topic = sanitizeTopic(item.topic)
    const filename = generateFilename(msg)
    const path = `${categoryDir}/${topic}/${filename}`
    const content = formatMarkdown(msg, item)

    files.push({
      path,
      content,
      message: `Add: ${item.topic}`,
    })
  }

  for (const file of files) {
    await writeSingleFile(file, env)
  }
}

async function writeSingleFile(
  file: GitHubFileContent,
  env: Env,
): Promise<void> {
  const url = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${file.path}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Sanctum-Sprite',
    },
    body: JSON.stringify({
      message: file.message,
      content: btoa(file.content),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GitHub API error: ${response.status} ${error}`)
  }
}
