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

    const wallets = await db
      .select({ communityId: schema.wallets.communityId, walletAddress: schema.wallets.walletAddress, username: schema.wallets.username })
      .from(schema.wallets)
      .where(eq(schema.wallets.telegramUserId, telegramUserId));

    if (!wallets || wallets.length === 0) {
      return NextResponse.json({ wallets: [] });
    }

    const communityIds = wallets.map((w) => w.communityId);

    const communities = await db
      .select({ id: schema.communities.id, name: schema.communities.name })
      .from(schema.communities)
      .where(inArray(schema.communities.id, communityIds));

    const communityMap = new Map(communities?.map((c) => [c.id, c.name]) ?? []);

    const tips = await db
      .select({ communityId: schema.tips.communityId, amount: schema.tips.amount, transactionStatus: schema.tips.transactionStatus })
      .from(schema.tips)
      .where(and(
        eq(schema.tips.telegramUserId, telegramUserId),
        inArray(schema.tips.transactionStatus, ['confirmed', 'pending', 'failed'])
      ));

    const earnedByCommunity = new Map<string, number>();

    for (const tip of tips ?? []) {
      if (tip.transactionStatus === 'confirmed') {
        earnedByCommunity.set(
          tip.communityId,
          (earnedByCommunity.get(tip.communityId) ?? 0) + Number(tip.amount)
        );
      }
    }

    const walletInfo = wallets.map((w) => ({
      communityId: w.communityId,
      communityName: communityMap.get(w.communityId) ?? 'Unknown',
      walletAddress: w.walletAddress,
      available: earnedByCommunity.get(w.communityId) ?? 0,
    }));

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
