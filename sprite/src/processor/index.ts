import { readQueue, deleteFromQueue } from './queue'
import { preprocessBatch } from './preprocess'
import { classifyWithWorkersAI } from './classify'
import { writeClassifiedToGitHub } from './github'

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log(
      'Scheduled worker triggered at:',
      new Date(event.scheduledTime).toISOString(),
    )

    try {
      await processQueue(env, ctx)
    } catch (error) {
      console.error('Scheduled worker failed:', error)
      throw error
    }
  },
}

export async function processQueue(
  env: Env,
  ctx?: ExecutionContext,
): Promise<void> {
  const messages = await readQueue(env)

  if (messages.length === 0) {
    console.log('Queue empty, nothing to process')
    return
  }

  console.log(`Processing ${messages.length} messages from queue`)

  const processed = await preprocessBatch(messages, env)

  const classification = await classifyWithWorkersAI(processed, env)

  await writeClassifiedToGitHub(processed, classification.items, env)

  const keys = messages.map((m) => m.key)
  await deleteFromQueue(env, keys)

  console.log(`Successfully processed ${messages.length} messages`)
}
