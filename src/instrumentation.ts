
export async function register() {
  // Only start the bot in the Node.js runtime to avoid browser issues
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initTelegramBot } = await import('@/lib/telegram-bot');
    
    // Prevent multiple instances in development due to HMR
    if (process.env.NODE_ENV === 'development') {
      // In dev mode, Next.js calls register multiple times
      // We rely on the internal singleton check in initTelegramBot
      initTelegramBot();
    } else {
      initTelegramBot();
    }
  }
}
