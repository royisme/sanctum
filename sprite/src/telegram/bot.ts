import { Bot, type Context } from 'grammy'
import type { Env, CaptureEvent } from '../types'
import { createCaptureHandler } from '../handlers/capture'
import { formatMarkdown } from '../markdown/format'
import { writeToGitHub } from '../github/contents'

export interface BotInstance {
  bot: Bot<Context>
  handleCapture: (ctx: Context) => Promise<void>
}

export function createBot(env: Env): BotInstance {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN)

  const handleCapture = async (ctx: Context): Promise<void> => {
    const createCapture = createCaptureHandler()
    const captureEvent = await createCapture(ctx)

    if (!captureEvent) {
      await ctx.reply('Skipped: not a text message')
      return
    }

    const markdownOutput = formatMarkdown(captureEvent)

    try {
      await writeToGitHub(markdownOutput, { env })
      const preview = captureEvent.rawText.substring(0, 50)
      const suffix = captureEvent.rawText.length > 50 ? '...' : ''
      await ctx.reply(`Saved to inbox: ${markdownOutput.filename}\n"${preview}${suffix}"`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Capture failed:', message)
      await ctx.reply(`Failed to save: ${message}`)
      throw err
    }
  }

  // Register handlers
  bot.on('message:text', handleCapture)

  return { bot, handleCapture }
}