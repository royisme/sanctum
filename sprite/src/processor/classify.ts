import type { ProcessedMessage, ClassificationResult } from '../types/queue'

export function buildClassificationPrompt(messages: ProcessedMessage[]): string {
  const payload = messages.map((m, i) => ({
    index: i,
    text: m.text.substring(0, 4000),
    source: m.sourceUrl || 'none',
    type: m.sourceType,
  }))

  return `You are a PARA classifier. Return JSON only.

Schema:
{
  "items": [
    {
      "index": 0,
      "category": "projects|areas|resources|archives|jobs",
      "topic": "topic-name",
      "summary": "short summary"
    }
  ]
}

Classification Guidelines:
- projects: Active work with deadlines
- areas: Ongoing responsibilities (health, finance, learning)
- resources: Reference materials, articles, tools
- archives: Completed or inactive items
- jobs: Job postings, career opportunities

Messages:
${payload.map((m) => `[${m.index}] ${m.text}\n  Type: ${m.type}\n  Source: ${m.source}`).join('\n\n')}`
}

export async function classifyWithWorkersAI(
  messages: ProcessedMessage[],
  env: Env,
): Promise<ClassificationResult> {
  const prompt = buildClassificationPrompt(messages)

  const response = await env.AI.run(
    '@cf/meta/llama-3.1-8b-instruct',
    {
      messages: [
        {
          role: 'system',
          content: 'You are a PARA classifier. Return JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
    {
      gateway: {
        id: env.AI_GATEWAY_ID,
        skipCache: false,
        cacheTtl: 3600,
      },
    },
  )

  return parseClassificationResult(response)
}

function parseClassificationResult(response: any): ClassificationResult {
  try {
    if (typeof response === 'string') {
      return JSON.parse(response)
    }

    if (response.response) {
      return JSON.parse(response.response)
    }

    if (response.items) {
      return response as ClassificationResult
    }

    throw new Error('Unexpected response format')
  } catch (error) {
    console.error('Failed to parse classification result:', error)
    throw error
  }
}
