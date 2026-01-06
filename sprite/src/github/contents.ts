import type { DailyFileOutput } from '../types'
import { mergeEntry } from '../markdown/format'

export function encodeBase64(str: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

export function decodeBase64(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

export interface GitHubWriteOptions {
  env: Env
}

interface GitHubFileResponse {
  content: string
  sha: string
}

async function getExistingFile(
  path: string,
  env: Env
): Promise<{ content: string; sha: string } | null> {
  const { GITHUB_TOKEN, REPO_OWNER, REPO_NAME } = env

  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'sprite-bot',
      },
    }
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error('GitHub GET failed:', response.status, errorText)
    throw new Error(`GitHub read failed: ${response.status}`)
  }

  const data = (await response.json()) as GitHubFileResponse
  return {
    content: decodeBase64(data.content),
    sha: data.sha,
  }
}

export async function writeDailyFile(
  output: DailyFileOutput,
  options: GitHubWriteOptions
): Promise<void> {
  const { GITHUB_TOKEN, REPO_OWNER, REPO_NAME } = options.env
  const path = `00_Inbox/${output.filename}`

  const existing = await getExistingFile(path, options.env)
  const mergedContent = mergeEntry(existing?.content ?? null, output)
  const encodedContent = encodeBase64(mergedContent)

  const body: Record<string, string> = {
    message: 'sprite: capture inbox item',
    content: encodedContent,
  }

  if (existing) {
    body.sha = existing.sha
  }

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
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('GitHub write failed:', response.status, errorText)
    throw new Error(`GitHub write failed: ${response.status}`)
  }
}
