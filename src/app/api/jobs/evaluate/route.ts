import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { createHash } from 'node:crypto';
import { serverConfig } from '@/lib/config';
import { evaluateMessage } from '@/lib/gemini/evaluate';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  getOrCreateContributorWallet,
  getWalletBalance,
  refreshTreasuryBalance,
} from '@/lib/cdp/wallets';
import { executeTip } from '@/lib/cdp/transfers';
import { sendTipAnnouncement } from '@/lib/telegram/notify';

export const runtime = 'nodejs';

interface JobPayload {
  communityId: string;
  telegramUserId: string;
  username: string;
  messageId: number;
  messageText: string;
  parentMessageText?: string;
  timestamp: number;
}

function computeIdempotencyKey(
  communityId: string,
  telegramUserId: string,
  messageId: number
): string {
  return createHash('sha256')
    .update(`${communityId}${telegramUserId}${messageId}`)
    .digest('hex');
}

export async function POST(request: NextRequest) {
  if (!serverConfig.hasQstashConfig) {
    return NextResponse.json({ error: 'qstash not configured' }, { status: 501 });
  }

  const receiver = new Receiver({
    currentSigningKey: serverConfig.qstashCurrentSigningKey,
    nextSigningKey: serverConfig.qstashNextSigningKey,
  });

  const rawBody = await request.text();
  const signature = request.headers.get('upstash-signature') || '';

  let isValid: boolean;
  try {
    isValid = await receiver.verify({ signature, body: rawBody });
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
  if (!isValid) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: JobPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const { communityId, telegramUserId, username, messageId, messageText, parentMessageText } =
    payload;
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'database not configured' }, { status: 500 });
  const logCtx = { step: '', communityId, telegramUserId, messageId };
  const today = new Date().toISOString().split('T')[0];

  const [community] = await db
    .select()
    .from(schema.communities)
    .where(eq(schema.communities.id, communityId))
    .limit(1);

  if (!community || !community.isActive) {
    console.error(JSON.stringify({ ...logCtx, error: 'community not found or inactive' }));
    return NextResponse.json({ skipped: 'community inactive' });
  }

  const idempotencyKey = computeIdempotencyKey(communityId, telegramUserId, messageId);

  const [existingTip] = await db
    .select({ id: schema.tips.id })
    .from(schema.tips)
    .where(eq(schema.tips.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existingTip) {
    return NextResponse.json({ skipped: 'duplicate' });
  }

  const evaluation = await evaluateMessage({
    messageText,
    parentMessageText,
    evalContext: community.evalContext ?? '',
    minScore: community.minScore,
  });

  const [evaluationRecord] = await db
    .insert(schema.evaluations)
    .values({
      communityId,
      telegramUserId,
      username,
      telegramMessageId: messageId,
      messageContent: messageText,
      score: evaluation.score,
      reason: evaluation.reason,
      shouldTip: evaluation.should_tip,
    })
    .returning();

  if (!evaluationRecord) {
    console.error(JSON.stringify({ ...logCtx, step: 'insert_evaluation' }));
    return NextResponse.json({ tipped: false, score: evaluation.score });
  }

  if (!evaluation.should_tip) {
    return NextResponse.json({ tipped: false, score: evaluation.score });
  }

  const [rateLimit] = await db
    .select()
    .from(schema.rateLimits)
    .where(and(
      eq(schema.rateLimits.communityId, communityId),
      eq(schema.rateLimits.telegramUserId, telegramUserId),
      eq(schema.rateLimits.date, today)
    ))
    .limit(1);

  if (rateLimit) {
    const cooldownMs = 30 * 60 * 1000;
    const lastTipAt = rateLimit.lastTipAt ? new Date(rateLimit.lastTipAt).getTime() : 0;
    const cooldownElapsed = Date.now() - lastTipAt >= cooldownMs;

    if (rateLimit.tipsToday >= community.dailyLimitPerUser || !cooldownElapsed) {
      await db
        .update(schema.evaluations)
        .set({ shouldTip: false })
        .where(eq(schema.evaluations.id, evaluationRecord.id));

      return NextResponse.json({ tipped: false, reason: 'rate limited' });
    }
  }

  const tipAmount = Number(evaluation.score >= 9 ? community.tipAmountHigh : community.tipAmountLow);

  const contributorWallet = await getOrCreateContributorWallet(communityId, telegramUserId, username);
  if (!contributorWallet) {
    await db.insert(schema.tips).values({
      communityId,
      evaluationId: evaluationRecord.id,
      telegramUserId,
      username,
      amount: String(tipAmount),
      walletAddress: null,
      cdpTransferId: null,
      txHash: null,
      transactionStatus: 'pending',
      failureReason: 'no_wallet',
      idempotencyKey,
    });
    return NextResponse.json({ tipped: false, reason: 'contributor has no wallet address' });
  }

  if (!community.treasuryAddress) {
    await db.insert(schema.tips).values({
      communityId,
      evaluationId: evaluationRecord.id,
      telegramUserId,
      username,
      amount: String(tipAmount),
      walletAddress: contributorWallet.walletAddress,
      cdpTransferId: null,
      txHash: null,
      transactionStatus: 'failed',
      failureReason: 'no_treasury',
      idempotencyKey,
    });
    return NextResponse.json({ tipped: false, reason: 'no treasury configured' });
  }

  const balanceAtomic = await getWalletBalance(community.treasuryAddress);
  const balanceUsdc = Number(balanceAtomic) / 1_000_000;

  if (balanceUsdc < tipAmount + 0.5) {
    await db.insert(schema.tips).values({
      communityId,
      evaluationId: evaluationRecord.id,
      telegramUserId,
      username,
      amount: String(tipAmount),
      walletAddress: contributorWallet.walletAddress,
      cdpTransferId: null,
      txHash: null,
      transactionStatus: 'failed',
      failureReason: 'insufficient_treasury',
      idempotencyKey,
    });
    return NextResponse.json({ tipped: false, reason: 'insufficient treasury' });
  }

  const transferResult = await executeTip({
    treasuryWalletAddress: community.treasuryAddress,
    contributorWalletAddress: contributorWallet.walletAddress,
    amount: tipAmount,
    idempotencyKey,
  });

  if (!transferResult.success) {
    const nonRetryable = transferResult.error?.includes('insufficient')
      || transferResult.error?.includes('invalid');

    if (!nonRetryable) {
      return NextResponse.json({ error: transferResult.error }, { status: 500 });
    }

    await db.insert(schema.tips).values({
      communityId,
      evaluationId: evaluationRecord.id,
      telegramUserId,
      username,
      amount: String(tipAmount),
      walletAddress: contributorWallet.walletAddress,
      cdpTransferId: transferResult.transferId,
      txHash: transferResult.txHash,
      transactionStatus: 'failed',
      failureReason: transferResult.error,
      idempotencyKey,
    });
    return NextResponse.json({ tipped: false, error: transferResult.error });
  }

  try {
    await db.insert(schema.tips).values({
      communityId,
      evaluationId: evaluationRecord.id,
      telegramUserId,
      username,
      amount: String(tipAmount),
      walletAddress: contributorWallet.walletAddress,
      cdpTransferId: transferResult.transferId,
      txHash: transferResult.txHash,
      transactionStatus: 'confirmed',
      idempotencyKey,
    });
  } catch (err) {
    console.error(JSON.stringify({ ...logCtx, step: 'insert_tip', error: err instanceof Error ? err.message : 'unknown' }));
  }

  await db.execute(
    sql`INSERT INTO rate_limits (community_id, telegram_user_id, date, tips_today, last_tip_at)
        VALUES (${communityId}, ${telegramUserId}, ${today}, 1, NOW())
        ON CONFLICT (community_id, telegram_user_id, date)
        DO UPDATE SET tips_today = rate_limits.tips_today + 1, last_tip_at = NOW()`
  );

  await refreshTreasuryBalance(communityId);

  try {
    await sendTipAnnouncement({
      botToken: community.botToken,
      chatId: community.telegramChatId,
      username,
      telegramUserId,
      amount: tipAmount,
      score: evaluation.score,
      reason: evaluation.reason,
      txHash: transferResult.txHash ?? undefined,
      claimUrl: `${serverConfig.appUrl}/claim`,
    });
  } catch (err) {
    console.error(
      JSON.stringify({ ...logCtx, step: 'notification', error: err instanceof Error ? err.message : 'unknown' })
    );
  }

  return NextResponse.json({ tipped: true, amount: tipAmount, txHash: transferResult.txHash });
}
