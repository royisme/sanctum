import { Bot, type Context } from 'grammy'
import { createCaptureHandler } from '../handlers/capture'
import { writeToQueue } from '../processor/queue'
import type { QueueMessage } from '../types/queue'

export interface BotInstance {
  bot: Bot<Context>
  handleCapture: (ctx: Context) => Promise<void>
}

export function createBot(env: Env): BotInstance {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN)

  bot.command('start', async (ctx) => {
    await ctx.reply('Bot started. Send messages to capture.')
  })

  bot.command('help', async (ctx) => {
    await ctx.reply('Send any message or link to save it to your vault.')
  })

  bot.on('message:text', async (ctx, next) => {
    if (ctx.message.text.startsWith('/')) {
      await ctx.reply('OK')
      return
    }
    await next()
  })

  const handleCapture = async (ctx: Context): Promise<void> => {
    const createCapture = createCaptureHandler()
    const captureEvent = await createCapture(ctx)

    if (!captureEvent) {
      await ctx.reply('Skipped: not a text message')
      return
    }

    try {
      const queueMessage: QueueMessage = {
        text: captureEvent.rawText,
        sourceUrl: captureEvent.sourceUrl,
        sourceType: captureEvent.sourceType,
        createdAt: captureEvent.createdAt,
        userId: ctx.from?.id,
      }

      await writeToQueue(env, queueMessage)

      await ctx.reply('✓')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Queue write failed:', message)
      await ctx.reply(`Failed to save: ${message}`)
      throw err
    }
  }

  bot.on('message:text', handleCapture)

  return { bot, handleCapture }
}
