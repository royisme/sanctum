import { Hono } from 'hono'
import type { HonoEnv } from './types'
import { createWebhookRoute } from './routes/webhook'

const app = new Hono<HonoEnv>()

app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({ ok: false, error: 'Internal error' }, 500)
})

// Webhook endpoint with token validation
app.post('/:token', async (c) => {
  const tokenParam = c.req.param('token')
  const webhook = createWebhookRoute(c.env)

  // Validate bot token
  if (!webhook.verifyToken(tokenParam)) {
    console.warn('Token mismatch:', tokenParam.substring(0, 8) + '...')
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }

  try {
    return await webhook.callback(tokenParam)(c)
  } catch (err) {
    console.error('Webhook processing error:', err)
    return c.json({ ok: false, error: 'Processing failed' }, 500)
  }
})

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok' }, 200)
})

export default app
