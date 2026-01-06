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
      return
    }

    const markdownOutput = formatMarkdown(captureEvent)

    await writeToGitHub(markdownOutput, {
      env,
    })
  }

  // Register handlers
  bot.on('message:text', handleCapture)

  return { bot, handleCapture }
}