import type { ProcessedMessage, ClassificationResult } from '../types/queue'
import { CLASSIFICATION_PROMPT } from '../prompts/classify'
import { chatCompletion } from '../lib/ai-gateway'

export function buildClassificationPrompt(
  messages: ProcessedMessage[],
): string {
  const payload = messages.map((m, i) => ({
    index: i,
    text: m.text.substring(0, 4000),
    source: m.sourceUrl || 'none',
    type: m.sourceType,
  }))

  return `${CLASSIFICATION_PROMPT}

Messages:
${payload.map((m) => `[${m.index}] ${m.text}\n  Type: ${m.type}\n  Source: ${m.source}`).join('\n\n')}`
}

export async function classifyWithWorkersAI(
  messages: ProcessedMessage[],
  env: Env,
): Promise<ClassificationResult> {
  const prompt = buildClassificationPrompt(messages)

  const content = await chatCompletion(
    env,
    [
      {
        role: 'system',
        content: 'You are a PARA classifier. Return JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      response_format: { type: 'json_object' },
    },
  )

  return parseClassificationResult(content)
}

function parseClassificationResult(response: string): ClassificationResult {
  try {
    // Clean up markdown code blocks if present
    const cleanContent = response.replace(/^```json\n|\n```$/g, '').trim()
    return JSON.parse(cleanContent)
  } catch (error) {
    console.error('Failed to parse classification result:', error)
    throw error
  }
}
