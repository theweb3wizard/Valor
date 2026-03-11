export async function register() {
  // In webhook mode, there is nothing to initialize at server startup.
  // The Telegram bot no longer polls — Telegram pushes updates to /api/telegram.
  // Community context is loaded lazily on the first webhook invocation.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Valor] Server runtime ready. Webhook mode active — listening at /api/telegram.');
  }
}