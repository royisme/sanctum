import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { writeToGitHub, encodeBase64 } from './contents'
import type { MarkdownOutput } from '../types'

describe('encodeBase64', () => {
  it('encodes ASCII string correctly', () => {
    const result = encodeBase64('Hello World')
    expect(result).toBe(btoa('Hello World'))
  })

  it('encodes UTF-8 string with Chinese characters', () => {
    const result = encodeBase64('你好世界')
    // Verify it decodes back correctly
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(result), (c) => c.charCodeAt(0))
    )
    expect(decoded).toBe('你好世界')
  })

  it('encodes mixed ASCII and Unicode', () => {
    const result = encodeBase64('Hello 世界!')
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(result), (c) => c.charCodeAt(0))
    )
    expect(decoded).toBe('Hello 世界!')
  })
})

describe('writeToGitHub', () => {
  const mockEnv = {
    GITHUB_TOKEN: 'test-token',
    REPO_OWNER: 'testowner',
    REPO_NAME: 'testrepo',
  }

  const mockOutput: MarkdownOutput = {
    filename: 'inbox-2024-01-15T10-30-00.000Z.md',
    markdownContent: '---\nsource-type: text\n---\n\nHello',
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls GitHub API with correct parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
    })
    vi.stubGlobal('fetch', mockFetch)

    await writeToGitHub(mockOutput, { env: mockEnv })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]

    expect(url).toBe(
      'https://api.github.com/repos/testowner/testrepo/contents/00_Inbox/inbox-2024-01-15T10-30-00.000Z.md'
    )
    expect(options.method).toBe('PUT')
    expect(options.headers.Authorization).toBe('Bearer test-token')

    const body = JSON.parse(options.body)
    expect(body.message).toBe('sprite: capture inbox item')
    expect(body.content).toBeTruthy()
  })

  it('retries with suffix on 409 conflict', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 409, text: () => 'conflict' })
      .mockResolvedValueOnce({ ok: true, status: 201 })
    vi.stubGlobal('fetch', mockFetch)

    await writeToGitHub(mockOutput, { env: mockEnv })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const secondUrl = mockFetch.mock.calls[1][0]
    expect(secondUrl).toContain('00_Inbox/inbox-2024-01-15T10-30-00.000Z-')
    expect(secondUrl).toContain('.md')
  })

  it('retries with suffix on 422 error', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 422, text: () => 'unprocessable' })
      .mockResolvedValueOnce({ ok: true, status: 201 })
    vi.stubGlobal('fetch', mockFetch)

    await writeToGitHub(mockOutput, { env: mockEnv })

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('throws error when retry also fails', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 409, text: () => 'conflict' })
      .mockResolvedValueOnce({ ok: false, status: 500, text: () => 'server error' })
    vi.stubGlobal('fetch', mockFetch)

    await expect(writeToGitHub(mockOutput, { env: mockEnv })).rejects.toThrow(
      'GitHub write failed: 500'
    )
  })

  it('throws error on non-conflict failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => 'forbidden',
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(writeToGitHub(mockOutput, { env: mockEnv })).rejects.toThrow(
      'GitHub write failed: 403'
    )
  })
})
