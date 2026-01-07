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
  const url = `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/compat/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      ...(options.response_format && { response_format: options.response_format }),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI Gateway error (${response.status}): ${errorText}`)
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('Empty response from AI provider')
  }

  return content
}
