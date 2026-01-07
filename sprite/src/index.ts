import { Hono } from 'hono'
import { webhookCallback } from 'grammy'
import type { HonoEnv } from './types'
import { createBot } from './telegram/bot'
import processor from './processor'

const app = new Hono<HonoEnv>()

app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({ ok: false, error: 'Internal error' }, 500)
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
