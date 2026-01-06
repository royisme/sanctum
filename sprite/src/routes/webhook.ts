import { webhookCallback, type Context, type Bot } from 'grammy'
import { createBot } from '../telegram/bot'

type HonoWebhookHandler = ReturnType<typeof webhookCallback<Context, 'hono'>>

export interface WebhookRoute {
  verifyToken: (tokenParam: string) => boolean
  callback: (token: string) => HonoWebhookHandler
}

export function createWebhookRoute(env: Env): WebhookRoute {
  const botCache = new Map<string, HonoWebhookHandler>()

  const verifyToken = (tokenParam: string): boolean => {
    return tokenParam === env.TELEGRAM_BOT_TOKEN
  }

  const getCallback = (token: string) => {
    if (!botCache.has(token)) {
      const { bot } = createBot(env)
      botCache.set(token, webhookCallback(bot, 'hono'))
    }
    return botCache.get(token)!
  }

  return {
    verifyToken,
    callback: getCallback,
  }
}

// Hono route configuration
export const webhookRoute = {
  path: '/:token',
}
