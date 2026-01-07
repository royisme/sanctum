import { Hono } from 'hono'
import { webhookCallback } from 'grammy'
import type { HonoEnv } from './types'
import { createBot } from './telegram/bot'
import processor, { processQueue } from './processor'

const app = new Hono<HonoEnv>()

app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({ ok: false, error: 'Internal error' }, 500)
})

app.post('/process-now', async (c) => {
  const authHeader = c.req.header('X-Admin-Secret')

  if (!authHeader || authHeader !== c.env.TELEGRAM_BOT_TOKEN) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }

  try {
    await processQueue(c.env, c.executionCtx)
    return c.json({ ok: true, message: 'Queue processing triggered' })
  } catch (err) {
    console.error('Manual processing failed:', err)
    return c.json({ ok: false, error: String(err), stack: (err as Error).stack }, 500)
  }
})

app.post('/:token', async (c) => {
  const tokenParam = c.req.param('token')

  if (tokenParam !== c.env.TELEGRAM_BOT_TOKEN) {
    console.warn('Token mismatch:', tokenParam.substring(0, 8) + '...')
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }

  try {
    const { bot } = createBot(c.env)
    const handleUpdate = webhookCallback(bot, 'hono')
    return await handleUpdate(c)
  } catch (err) {
    console.error('Webhook processing error:', err)
    return c.json({ ok: false, error: 'Processing failed' }, 500)
  }
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' }, 200)
})

export default {
  fetch: app.fetch,
  scheduled: processor.scheduled,
}
