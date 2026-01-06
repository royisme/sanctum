import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { writeDailyFile, encodeBase64, decodeBase64 } from './contents'
import type { DailyFileOutput } from '../types'

describe('encodeBase64', () => {
  it('encodes ASCII string correctly', () => {
    const result = encodeBase64('Hello World')
    expect(result).toBe(btoa('Hello World'))
  })

  it('encodes UTF-8 string with Chinese characters', () => {
    const result = encodeBase64('你好世界')
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

describe('decodeBase64', () => {
  it('decodes ASCII string correctly', () => {
    const encoded = btoa('Hello World')
    expect(decodeBase64(encoded)).toBe('Hello World')
  })

  it('roundtrips UTF-8 correctly', () => {
    const original = '你好世界'
    const encoded = encodeBase64(original)
    expect(decodeBase64(encoded)).toBe(original)
  })
})

describe('writeDailyFile', () => {
  const mockEnv: Env = {
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
    GITHUB_TOKEN: 'test-token',
    REPO_OWNER: 'testowner',
    REPO_NAME: 'testrepo',
  }

  const mockOutput: DailyFileOutput = {
    filename: 'inbox-2024-01-15.md',
    date: '2024-01-15',
    entry: {
      time: '10:30',
      hour: '10:00',
      text: 'Hello',
      sourceType: 'text',
      sourceUrl: '',
    },
  }

  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates new file when file does not exist', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, status: 201 })

    await writeDailyFile(mockOutput, { env: mockEnv })

    expect(mockFetch).toHaveBeenCalledTimes(2)

    const [getUrl] = mockFetch.mock.calls[0]
    expect(getUrl).toContain('00_Inbox/inbox-2024-01-15.md')

    const [putUrl, putOptions] = mockFetch.mock.calls[1]
    expect(putUrl).toContain('00_Inbox/inbox-2024-01-15.md')
    expect(putOptions.method).toBe('PUT')

    const body = JSON.parse(putOptions.body)
    expect(body.sha).toBeUndefined()
  })

  it('updates existing file with SHA', async () => {
    const existingContent = encodeBase64('---\ndate: 2024-01-15\n---\n\n## 09:00\n\n- 09:15 Earlier message')
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ content: existingContent, sha: 'abc123' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 })

    await writeDailyFile(mockOutput, { env: mockEnv })

    expect(mockFetch).toHaveBeenCalledTimes(2)

    const [, putOptions] = mockFetch.mock.calls[1]
    const body = JSON.parse(putOptions.body)
    expect(body.sha).toBe('abc123')

    const decodedContent = decodeBase64(body.content)
    expect(decodedContent).toContain('## 09:00')
    expect(decodedContent).toContain('## 10:00')
    expect(decodedContent).toContain('10:30 Hello')
  })

  it('throws error on GET failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('server error'),
    })

    await expect(writeDailyFile(mockOutput, { env: mockEnv })).rejects.toThrow(
      'GitHub read failed: 500'
    )
  })

  it('throws error on PUT failure', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve('forbidden'),
      })

    await expect(writeDailyFile(mockOutput, { env: mockEnv })).rejects.toThrow(
      'GitHub write failed: 403'
    )
  })
})
