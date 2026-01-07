import type { QueueMessage } from '../types/queue'

export async function writeToQueue(
  env: Env,
  message: QueueMessage,
): Promise<void> {
  const queueKey = `inbox:${Date.now()}:${crypto.randomUUID()}`
  await env.INBOX_QUEUE.put(queueKey, JSON.stringify(message), {
    expirationTtl: 604800,
  })
}

export async function readQueue(
  env: Env,
): Promise<Array<{ key: string; data: QueueMessage }>> {
  const list = await env.INBOX_QUEUE.list({ prefix: 'inbox:' })

  if (list.keys.length === 0) {
    return []
  }

  const messages = await Promise.all(
    list.keys.map(async (key) => {
      const value = await env.INBOX_QUEUE.get(key.name)
      if (!value) return null
      return {
        key: key.name,
        data: JSON.parse(value) as QueueMessage,
      }
    }),
  )

  return messages.filter((m) => m !== null) as Array<{
    key: string
    data: QueueMessage
  }>
}

export async function deleteFromQueue(env: Env, keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => env.INBOX_QUEUE.delete(key)))
}
