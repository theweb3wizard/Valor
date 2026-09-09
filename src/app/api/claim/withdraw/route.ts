import { NextRequest, NextResponse } from 'next/server';
import { executeWithdrawal } from '@/lib/cdp/transfers';
import { retryPendingTips } from '@/lib/cdp/wallets';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { isAddress } from 'viem';
import { createHash } from 'node:crypto';
import { verifyClaimSignature } from '@/lib/claim-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`claim-withdraw:${ip}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ error: 'rate limited' }, { status: 429 });

    const body = await request.json();
    const { communityId, telegramUserId, walletAddress, destinationAddress, amount, sig, idempotencyKey: clientKey } = body as {
      communityId: string;
      telegramUserId: string;
      walletAddress: string;
      destinationAddress: string;
      amount: number;
      sig?: string;
      idempotencyKey?: string;
    };

    if (!communityId || !telegramUserId || !walletAddress || !destinationAddress || !amount) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
    }

    if (!verifyClaimSignature(telegramUserId, sig ?? null)) {
      return NextResponse.json({ error: 'invalid or missing signature' }, { status: 401 });
    }

    if (!isAddress(destinationAddress)) {
      return NextResponse.json({ error: 'invalid destination address' }, { status: 400 });
    }

    if (amount <= 0 || !Number.isFinite(amount)) {
      return NextResponse.json({ error: 'invalid amount' }, { status: 400 });
    }

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'database not configured' }, { status: 500 });

    // Server-side available check (confirmed tips minus withdrawals)
    const tips = await db.select({ amount: schema.tips.amount, transactionStatus: schema.tips.transactionStatus })
      .from(schema.tips)
      .where(and(eq(schema.tips.communityId, communityId), eq(schema.tips.telegramUserId, telegramUserId), inArray(schema.tips.transactionStatus, ['confirmed'])));
    const gross = (tips ?? []).reduce((s, t) => s + Number(t.amount), 0);
    let withdrawn = 0;
    try {
      const withdrawals = await db.select({ amount: schema.withdrawals.amount }).from(schema.withdrawals)
        .where(and(eq(schema.withdrawals.communityId, communityId), eq(schema.withdrawals.telegramUserId, telegramUserId)));
      withdrawn = (withdrawals ?? []).reduce((s, w) => s + Number(w.amount), 0);
    } catch { withdrawn = 0; }
    const available = Math.max(0, gross - withdrawn);
    if (amount > available) {
      return NextResponse.json({ error: `insufficient available: ${available.toFixed(2)} USDC` }, { status: 400 });
    }

    const idempotencyKey = clientKey || createHash('sha256').update(`${communityId}:${telegramUserId}:${destinationAddress}:${amount}:${Date.now()}`).digest('hex').slice(0, 32);
    const [existingWithdraw] = await db.select({ id: schema.withdrawals.id, txHash: schema.withdrawals.txHash }).from(schema.withdrawals).where(eq(schema.withdrawals.idempotencyKey, idempotencyKey)).limit(1);
    if (existingWithdraw) {
      return NextResponse.json({ txHash: existingWithdraw.txHash, duplicate: true });
    }

    const [existing] = await db
      .select()
      .from(schema.wallets)
      .where(and(
        eq(schema.wallets.communityId, communityId),
        eq(schema.wallets.telegramUserId, telegramUserId)
      ))
      .limit(1);

    if (!existing) {
      const [tip] = await db
        .select({ username: schema.tips.username })
        .from(schema.tips)
        .where(and(
          eq(schema.tips.communityId, communityId),
          eq(schema.tips.telegramUserId, telegramUserId)
        ))
        .limit(1);

      await db.insert(schema.wallets).values({
        communityId,
        telegramUserId,
        username: tip?.username ?? 'unknown',
        walletAddress: destinationAddress,
      });
    } else {
      await db.update(schema.wallets)
        .set({ walletAddress: destinationAddress })
        .where(eq(schema.wallets.id, existing.id));
    }

    const retryResult = await retryPendingTips(communityId, telegramUserId);

    const result = await executeWithdrawal({
      communityId,
      contributorWalletAddress: destinationAddress,
      destinationAddress,
      amount,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'withdrawal failed' }, { status: 500 });
    }

    try {
      await db.insert(schema.withdrawals).values({
        communityId,
        telegramUserId,
        destinationAddress,
        amount: String(amount),
        txHash: result.txHash,
        idempotencyKey,
      });
    } catch (e) {
      // unique violation means duplicate — treat as success
      const msg = e instanceof Error ? e.message : '';
      if (!msg.includes('unique') && !msg.includes('duplicate')) {
        console.error(JSON.stringify({ step: 'withdraw_insert', error: msg }));
      }
    }

    return NextResponse.json({
      txHash: result.txHash,
      tipsRetried: retryResult.retried,
      tipsSucceeded: retryResult.succeeded,
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'claim_withdraw',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
