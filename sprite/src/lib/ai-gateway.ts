export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface CompletionOptions {
  model?: string
  response_format?: { type: 'json_object' | 'text' }
}

export async function chatCompletion(
  env: Env,
  messages: ChatMessage[],
  options: CompletionOptions = {},
): Promise<string> {
  const model = options.model || env.AI_MODEL || 'dynamic/sanctum-classifier'

  try {
    const response = await env.AI.gateway(env.AI_GATEWAY_ID).run({
      provider: 'compat',
      endpoint: 'chat/completions',
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
      },
      query: {
        model,
        messages,
        ...(options.response_format && {
          response_format: options.response_format,
        }),
      },
    })

    // Response is the raw API response object
    const data = response as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('Empty response from AI provider')
    }

    return content
  } catch (error) {
    console.error('LLM Request failed:', error)
    throw error
  }
}
