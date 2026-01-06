import { webhookCallback } from 'grammy'
import type { HonoEnv, Env } from '../types'
import { createBot } from '../telegram/bot'

export interface WebhookRoute {
  verifyToken: (tokenParam: string) => boolean
  callback: (token: string) => ReturnType<typeof webhookCallback>
}

export function createWebhookRoute(env: Env): WebhookRoute {
  const botCache = new Map<string, ReturnType<typeof webhookCallback>>()

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