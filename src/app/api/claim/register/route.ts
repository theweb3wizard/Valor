import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { isAddress } from 'viem';
import { retryPendingTips } from '@/lib/cdp/wallets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { communityId, telegramUserId, walletAddress } = body as {
      communityId: string;
      telegramUserId: string;
      walletAddress: string;
    };

    if (!communityId || !telegramUserId || !walletAddress) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
    }

    if (!isAddress(walletAddress)) {
      return NextResponse.json({ error: 'invalid evm address' }, { status: 400 });
    }

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'database not configured' }, { status: 500 });

    const [existing] = await db
      .select()
      .from(schema.wallets)
      .where(and(
        eq(schema.wallets.communityId, communityId),
        eq(schema.wallets.telegramUserId, telegramUserId)
      ))
      .limit(1);

    if (existing) {
      await db.update(schema.wallets)
        .set({ walletAddress })
        .where(eq(schema.wallets.id, existing.id));
    } else {
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
        walletAddress,
      });
    }

    const retryResult = await retryPendingTips(communityId, telegramUserId);

    return NextResponse.json({
      registered: true,
      walletAddress,
      tipsRetried: retryResult.retried,
      tipsSucceeded: retryResult.succeeded,
      tipsFailed: retryResult.failed,
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        step: 'claim_register',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
