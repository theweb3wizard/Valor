export async function register() {
  // Only run in the Node.js runtime.
  // This guard prevents Next.js from attempting to execute this in the
  // Edge runtime, which does not support node-telegram-bot-api.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initTelegramBot } = await import('@/lib/telegram-bot');
    await initTelegramBot();
  }
}