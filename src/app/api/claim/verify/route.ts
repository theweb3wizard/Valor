import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const telegramUserId = request.nextUrl.searchParams.get('telegramUserId');

    if (!telegramUserId) {
      return NextResponse.json({ error: 'telegramUserId required' }, { status: 400 });
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

    const walletInfo = communityIds.map((communityId) => {
      const communityTips = (tips ?? []).filter((t) => t.communityId === communityId);
      const available = communityTips
        .filter((t) => t.transactionStatus === 'confirmed')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const pending = communityTips
        .filter((t) => t.transactionStatus === 'pending' && t.failureReason === 'no_wallet')
        .reduce((sum, t) => sum + Number(t.amount), 0);

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
