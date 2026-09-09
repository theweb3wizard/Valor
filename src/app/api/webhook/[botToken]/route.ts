import { NextRequest, NextResponse } from 'next/server';
import { serverConfig } from '@/lib/config';
import { shouldEvaluate, type TelegramMessage } from '@/lib/telegram/filters';
import { enqueueEvaluationJob } from '@/lib/qstash/client';
import { createHash } from 'node:crypto';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

function computeWebhookSecret(botToken: string): string {
  if (!serverConfig.hasCronSecret) {
    if (!serverConfig.isDev) {
      throw new Error('CRON_SECRET not configured');
    }
    console.warn('CRON_SECRET missing — using dev fallback. Do not use in production.');
    return createHash('sha256').update(botToken + 'dev-fallback-secret').digest('hex');
  }
  return createHash('sha256')
    .update(botToken + serverConfig.cronSecret)
    .digest('hex');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botToken: string }> }
) {
  try {
    const { botToken } = await params;

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'database not configured' }, { status: 500 });
    }

    const [community] = await db
      .select({ id: schema.communities.id, botToken: schema.communities.botToken, telegramChatId: schema.communities.telegramChatId })
      .from(schema.communities)
      .where(eq(schema.communities.botToken, botToken))
      .limit(1);

    if (!community) {
      return NextResponse.json({ error: 'community not found' }, { status: 404 });
    }

    let expectedSecret: string;
    try {
      expectedSecret = computeWebhookSecret(community.botToken);
    } catch {
      return NextResponse.json({ error: 'server misconfigured: CRON_SECRET missing' }, { status: 500 });
    }
    const providedSecret = req.headers.get('x-telegram-bot-api-secret-token');
    // In dev, allow missing header when using fallback so local ngrok/manual tests work
    const allowMissingInDev = serverConfig.isDev && !serverConfig.hasCronSecret;
    if (!allowMissingInDev && (!providedSecret || providedSecret !== expectedSecret)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const update = await req.json();

    if (!update.message || !update.message.from) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message as TelegramMessage & {
      message_id: number;
      date: number;
      chat: { id: number };
      from: { id: number; is_bot?: boolean; username?: string };
    };

    if (community.telegramChatId?.startsWith('pending-') && message.chat?.id) {
      await db
        .update(schema.communities)
        .set({ telegramChatId: String(message.chat.id) })
        .where(eq(schema.communities.id, community.id));
    }

    if (!shouldEvaluate(message)) {
      return NextResponse.json({ ok: true, skipped: 'filtered' });
    }

    const telegramUserId = String(message.from.id);
    const username = message.from.username ?? `user${telegramUserId}`;
    const messageText = message.text ?? '';
    const parentMessageText = message.reply_to_message?.text;

    const jobId = await enqueueEvaluationJob({
      communityId: community.id,
      telegramUserId,
      username,
      messageId: message.message_id,
      messageText,
      parentMessageText,
      timestamp: message.date,
    });

    if (!jobId) {
      console.error(JSON.stringify({
        step: 'webhook_handler',
        communityId: community.id,
        warning: 'QStash not configured — evaluation job skipped',
      }));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'webhook_handler',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ ok: true });
  }
}
