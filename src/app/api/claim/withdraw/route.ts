import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase/server';
import { executeWithdrawal } from '@/lib/cdp/transfers';

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

    const supabase = createServiceSupabase();

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('community_id', communityId)
      .eq('telegram_user_id', telegramUserId)
      .single();

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
