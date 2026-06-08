import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { createHash } from 'node:crypto';
import { serverConfig } from '@/lib/config';
import { createServiceSupabase } from '@/lib/supabase/server';
import { evaluateMessage } from '@/lib/gemini/evaluate';
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
  const supabase = createServiceSupabase();
  const logCtx = { step: '', communityId, telegramUserId, messageId };
  const today = new Date().toISOString().split('T')[0];

  const { data: community, error: communityError } = await supabase
    .from('communities')
    .select('*')
    .eq('id', communityId)
    .single();

  if (communityError || !community || !community.is_active) {
    console.error(JSON.stringify({ ...logCtx, error: 'community not found or inactive' }));
    return NextResponse.json({ skipped: 'community inactive' });
  }

  if (community.plan_id) {
    const { data: plan } = await supabase
      .from('plans')
      .select('max_evals_monthly, max_tips_monthly')
      .eq('id', community.plan_id)
      .single();

    if (plan) {
      const { data: usage } = await supabase
        .rpc('get_community_usage', { p_community_id: communityId });

      const typedUsage = usage as unknown as
        | { evals_this_month: number; tips_this_month: number }
        | undefined;

      if (typedUsage) {
        if (plan.max_evals_monthly >= 0 && typedUsage.evals_this_month >= plan.max_evals_monthly) {
          return NextResponse.json({ skipped: 'plan limit reached', reason: 'eval limit' });
        }
        if (plan.max_tips_monthly >= 0 && typedUsage.tips_this_month >= plan.max_tips_monthly) {
          return NextResponse.json({ skipped: 'plan limit reached', reason: 'tip limit' });
        }
      }
    }
  }

  const idempotencyKey = computeIdempotencyKey(communityId, telegramUserId, messageId);

  const { data: existingTip } = await supabase
    .from('tips')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .single();

  if (existingTip) {
    return NextResponse.json({ skipped: 'duplicate' });
  }

  const evaluation = await evaluateMessage({
    messageText,
    parentMessageText,
    evalContext: community.eval_context ?? '',
    minScore: community.min_score,
  });

  const { data: evaluationRecord, error: evalError } = await supabase
    .from('evaluations')
    .insert({
      community_id: communityId,
      telegram_user_id: telegramUserId,
      username,
      telegram_message_id: messageId,
      message_content: messageText,
      score: evaluation.score,
      reason: evaluation.reason,
      should_tip: evaluation.should_tip,
    })
    .select()
    .single();

  if (evalError) {
    console.error(JSON.stringify({ ...logCtx, step: 'insert_evaluation', error: evalError.message }));
    return NextResponse.json({ tipped: false, score: evaluation.score });
  }

  if (!evaluation.should_tip) {
    return NextResponse.json({ tipped: false, score: evaluation.score });
  }

  const { data: rateLimit } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('community_id', communityId)
    .eq('telegram_user_id', telegramUserId)
    .eq('date', today)
    .single();

  if (rateLimit) {
    const cooldownMs = 30 * 60 * 1000;
    const lastTipAt = rateLimit.last_tip_at ? new Date(rateLimit.last_tip_at).getTime() : 0;
    const cooldownElapsed = Date.now() - lastTipAt >= cooldownMs;

    if (rateLimit.tips_today >= community.daily_limit_per_user || !cooldownElapsed) {
      await supabase
        .from('evaluations')
        .update({ should_tip: false })
        .eq('id', evaluationRecord.id);

      return NextResponse.json({ tipped: false, reason: 'rate limited' });
    }
  }

  const contributorWallet = await getOrCreateContributorWallet(communityId, telegramUserId, username);
  if (!contributorWallet) {
    return NextResponse.json({ tipped: false, reason: 'CDP not configured' });
  }

  const tipAmount = evaluation.score >= 9 ? community.tip_amount_high : community.tip_amount_low;

  if (!community.treasury_address) {
    await supabase.from('tips').insert({
      community_id: communityId,
      evaluation_id: evaluationRecord.id,
      telegram_user_id: telegramUserId,
      username,
      amount: tipAmount,
      wallet_address: contributorWallet.walletAddress,
      cdp_transfer_id: null,
      tx_hash: null,
      transaction_status: 'failed',
      failure_reason: 'no_treasury',
      idempotency_key: idempotencyKey,
    });
    return NextResponse.json({ tipped: false, reason: 'no treasury configured' });
  }

  const balanceAtomic = await getWalletBalance(community.treasury_address);
  const balanceUsdc = Number(balanceAtomic) / 1_000_000;

  if (balanceUsdc < tipAmount + 0.5) {
    await supabase.from('tips').insert({
      community_id: communityId,
      evaluation_id: evaluationRecord.id,
      telegram_user_id: telegramUserId,
      username,
      amount: tipAmount,
      wallet_address: contributorWallet.walletAddress,
      cdp_transfer_id: null,
      tx_hash: null,
      transaction_status: 'failed',
      failure_reason: 'insufficient_treasury',
      idempotency_key: idempotencyKey,
    });
    return NextResponse.json({ tipped: false, reason: 'insufficient treasury' });
  }

  const transferResult = await executeTip({
    treasuryWalletAddress: community.treasury_address,
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

    await supabase.from('tips').insert({
      community_id: communityId,
      evaluation_id: evaluationRecord.id,
      telegram_user_id: telegramUserId,
      username,
      amount: tipAmount,
      wallet_address: contributorWallet.walletAddress,
      cdp_transfer_id: transferResult.transferId,
      tx_hash: transferResult.txHash,
      transaction_status: 'failed',
      failure_reason: transferResult.error,
      idempotency_key: idempotencyKey,
    });
    return NextResponse.json({ tipped: false, error: transferResult.error });
  }

  const { error: tipError } = await supabase.from('tips').insert({
    community_id: communityId,
    evaluation_id: evaluationRecord.id,
    telegram_user_id: telegramUserId,
    username,
    amount: tipAmount,
    wallet_address: contributorWallet.walletAddress,
    cdp_transfer_id: transferResult.transferId,
    tx_hash: transferResult.txHash,
    transaction_status: 'confirmed',
    idempotency_key: idempotencyKey,
  });

  if (tipError) {
    console.error(JSON.stringify({ ...logCtx, step: 'insert_tip', error: tipError.message }));
  }

  await supabase.rpc('upsert_rate_limit', {
    p_community_id: communityId,
    p_telegram_user_id: telegramUserId,
    p_date: today,
    p_last_tip_at: new Date().toISOString(),
  });

  await refreshTreasuryBalance(communityId);

  try {
    await sendTipAnnouncement({
      botToken: community.bot_token,
      chatId: community.telegram_chat_id,
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
