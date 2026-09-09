import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { verifyClaimSignature } from '@/lib/claim-auth';

export async function GET(request: NextRequest) {
  try {
    const telegramUserId = request.nextUrl.searchParams.get('telegramUserId');
    const sig = request.nextUrl.searchParams.get('sig');

    if (!telegramUserId) {
      return NextResponse.json({ error: 'telegramUserId required' }, { status: 400 });
    }

    if (!verifyClaimSignature(telegramUserId, sig)) {
      return NextResponse.json({ error: 'invalid or missing signature' }, { status: 401 });
    }

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'database not configured' }, { status: 500 });

    const tips = await db
      .select({
        communityId: schema.tips.communityId,
        amount: schema.tips.amount,
        transactionStatus: schema.tips.transactionStatus,
        failureReason: schema.tips.failureReason,
        walletAddress: schema.tips.walletAddress,
      })
      .from(schema.tips)
      .where(and(
        eq(schema.tips.telegramUserId, telegramUserId),
        inArray(schema.tips.transactionStatus, ['confirmed', 'pending', 'failed'])
      ));

    const communityIds = [...new Set((tips ?? []).map((t) => t.communityId))];

    if (communityIds.length === 0) {
      return NextResponse.json({ wallets: [] });
    }

    const communities = await db
      .select({ id: schema.communities.id, name: schema.communities.name })
      .from(schema.communities)
      .where(inArray(schema.communities.id, communityIds));

    const communityMap = new Map(communities?.map((c) => [c.id, c.name]) ?? []);

    const userWallets = await db
      .select({
        communityId: schema.wallets.communityId,
        walletAddress: schema.wallets.walletAddress,
      })
      .from(schema.wallets)
      .where(and(
        eq(schema.wallets.telegramUserId, telegramUserId),
        inArray(schema.wallets.communityId, communityIds)
      ));

    const walletMap = new Map(userWallets?.map((w) => [w.communityId, w.walletAddress]) ?? []);

    // Deduct withdrawals from available — tolerate missing table on fresh dev DB
    let withdrawals: { communityId: string; amount: string }[] = [];
    try {
      withdrawals = communityIds.length
        ? await db.select({ communityId: schema.withdrawals.communityId, amount: schema.withdrawals.amount })
            .from(schema.withdrawals)
            .where(and(eq(schema.withdrawals.telegramUserId, telegramUserId), inArray(schema.withdrawals.communityId, communityIds)))
        : [];
    } catch {
      withdrawals = [];
    }

    const withdrawnByCommunity = new Map<string, number>();
    for (const w of withdrawals ?? []) {
      withdrawnByCommunity.set(w.communityId, (withdrawnByCommunity.get(w.communityId) ?? 0) + Number(w.amount));
    }

    const walletInfo = communityIds.map((communityId) => {
      const communityTips = (tips ?? []).filter((t) => t.communityId === communityId);
      const grossAvailable = communityTips
        .filter((t) => t.transactionStatus === 'confirmed')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const pending = communityTips
        .filter((t) => t.transactionStatus === 'pending' && t.failureReason === 'no_wallet')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const withdrawn = withdrawnByCommunity.get(communityId) ?? 0;
      const available = Math.max(0, grossAvailable - withdrawn);

      return {
        communityId,
        communityName: communityMap.get(communityId) ?? 'Unknown',
        walletAddress: walletMap.get(communityId) ?? '',
        available,
        pending,
      };
    });

    return NextResponse.json({ wallets: walletInfo });
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'claim_verify',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
