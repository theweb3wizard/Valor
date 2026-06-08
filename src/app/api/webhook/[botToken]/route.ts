import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase/server';
import { serverConfig } from '@/lib/config';
import { shouldEvaluate, type TelegramMessage } from '@/lib/telegram/filters';
import { enqueueEvaluationJob } from '@/lib/qstash/client';
import { createHash } from 'node:crypto';

function computeWebhookSecret(botToken: string): string {
  const secret = serverConfig.hasCronSecret ? serverConfig.cronSecret : 'dev-fallback-secret';
  return createHash('sha256')
    .update(botToken + secret)
    .digest('hex');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botToken: string }> }
) {
  try {
    const { botToken } = await params;

    const supabase = createServiceSupabase();

    const { data: community, error } = await supabase
      .from('communities')
      .select('id, bot_token, telegram_chat_id')
      .eq('bot_token', botToken)
      .single();

    if (error || !community) {
      return NextResponse.json({ error: 'community not found' }, { status: 404 });
    }

    const expectedSecret = computeWebhookSecret(community.bot_token);
    const providedSecret = req.headers.get('x-telegram-bot-api-secret-token');

    if (!providedSecret || providedSecret !== expectedSecret) {
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

    if (community.telegram_chat_id?.startsWith('pending-') && message.chat?.id) {
      await supabase
        .from('communities')
        .update({ telegram_chat_id: String(message.chat.id) })
        .eq('id', community.id);
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
