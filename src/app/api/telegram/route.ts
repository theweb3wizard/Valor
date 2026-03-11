import { NextRequest, NextResponse } from 'next/server';
import { processWebhookUpdate } from '@/lib/telegram-bot';

// Secret token to verify requests genuinely come from Telegram.
// Set TELEGRAM_WEBHOOK_SECRET in Vercel environment variables —
// any long random string works (e.g. openssl rand -hex 32).
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify the request is from Telegram using the secret token header.
  // Telegram sends this header when the webhook was registered with a secret_token.
  if (WEBHOOK_SECRET) {
    const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
    if (incomingSecret !== WEBHOOK_SECRET) {
      console.warn('[Webhook] Rejected request — invalid or missing secret token.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let update;
  try {
    update = await req.json();
  } catch (err) {
    console.error('[Webhook] Failed to parse request body as JSON:', err);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[Webhook] Received update id:', update?.update_id ?? 'unknown');

  try {
    // Process the update — this runs the full filter → AI → tip pipeline.
    // We must respond to Telegram within 10 seconds or it will retry.
    // processWebhookUpdate is designed to be fast enough for this constraint.
    await processWebhookUpdate(update);
  } catch (err) {
    // Always return 200 to Telegram even on internal errors.
    // A non-200 response causes Telegram to retry the update repeatedly.
    console.error('[Webhook] Error processing update:', err);
  }

  // Always return 200 OK to Telegram to acknowledge receipt.
  return NextResponse.json({ ok: true }, { status: 200 });
}

// Reject all non-POST methods cleanly.
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}