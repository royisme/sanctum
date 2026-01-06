import type { MarkdownOutput } from '../types'

export function encodeBase64(str: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

export interface GitHubWriteOptions {
  env: {
    GITHUB_TOKEN: string
    REPO_OWNER: string
    REPO_NAME: string
  }
}

export async function writeToGitHub(
  output: MarkdownOutput,
  options: GitHubWriteOptions
): Promise<void> {
  const { GITHUB_TOKEN, REPO_OWNER, REPO_NAME } = options.env
  const path = `00_Inbox/${output.filename}`
  const content = encodeBase64(output.markdownContent)

  // First attempt
  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'sprite-bot',
      },
      body: JSON.stringify({
        message: 'sprite: capture inbox item',
        content,
      }),
    }
  )

  // Handle conflict with retry
  if (response.status === 409 || response.status === 422) {
    const suffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 5)
    const retryFilename = output.filename.replace('.md', `-${suffix}.md`)
    const retryPath = `00_Inbox/${retryFilename}`

    const retryResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${retryPath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'sprite-bot',
        },
        body: JSON.stringify({
          message: 'sprite: capture inbox item',
          content: encodeBase64(output.markdownContent),
        }),
      }
    )

    if (!retryResponse.ok) {
      const errorText = await retryResponse.text()
      console.error('GitHub retry failed:', retryResponse.status, errorText)
      throw new Error(`GitHub write failed: ${retryResponse.status}`)
    }
    return
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error('GitHub write failed:', response.status, errorText)
    throw new Error(`GitHub write failed: ${response.status}`)
  }
}