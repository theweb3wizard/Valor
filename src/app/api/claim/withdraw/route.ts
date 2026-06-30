import { NextRequest, NextResponse } from 'next/server';
import { executeWithdrawal } from '@/lib/cdp/transfers';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { communityId, telegramUserId, walletAddress, destinationAddress, amount } = body as {
      communityId: string;
      telegramUserId: string;
      walletAddress: string;
      destinationAddress: string;
      amount: number;
    };

    if (!communityId || !telegramUserId || !walletAddress || !destinationAddress || !amount) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'invalid amount' }, { status: 400 });
    }

    const db = getDb();
    if (!db) return NextResponse.json({ error: 'database not configured' }, { status: 500 });

    const [wallet] = await db
      .select()
      .from(schema.wallets)
      .where(and(
        eq(schema.wallets.communityId, communityId),
        eq(schema.wallets.telegramUserId, telegramUserId)
      ))
      .limit(1);

    if (!wallet) {
      return NextResponse.json({ error: 'wallet not found' }, { status: 404 });
    }

    const result = await executeWithdrawal({
      contributorWalletAddress: walletAddress,
      destinationAddress,
      amount,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'withdrawal failed' }, { status: 500 });
    }

    return NextResponse.json({ txHash: result.txHash });
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
