import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const telegramUserId = request.nextUrl.searchParams.get('telegramUserId');

    if (!telegramUserId) {
      return NextResponse.json({ error: 'telegramUserId required' }, { status: 400 });
    }

    const supabase = createServiceSupabase();

    const { data: wallets } = await supabase
      .from('wallets')
      .select('community_id, wallet_address, username')
      .eq('telegram_user_id', telegramUserId);

    if (!wallets || wallets.length === 0) {
      return NextResponse.json({ wallets: [] });
    }

    const communityIds = wallets.map((w) => w.community_id);

    const { data: communities } = await supabase
      .from('communities')
      .select('id, name')
      .in('id', communityIds);

    const communityMap = new Map(communities?.map((c) => [c.id, c.name]) ?? []);

    const { data: tips } = await supabase
      .from('tips')
      .select('community_id, amount, transaction_status')
      .eq('telegram_user_id', telegramUserId)
      .in('transaction_status', ['confirmed', 'pending', 'failed']);

    const earnedByCommunity = new Map<string, number>();
    const pendingByCommunity = new Map<string, number>();

    for (const tip of tips ?? []) {
      if (tip.transaction_status === 'confirmed') {
        earnedByCommunity.set(
          tip.community_id,
          (earnedByCommunity.get(tip.community_id) ?? 0) + tip.amount
        );
      }
    }

    const walletInfo = wallets.map((w) => ({
      communityId: w.community_id,
      communityName: communityMap.get(w.community_id) ?? 'Unknown',
      walletAddress: w.wallet_address,
      available: earnedByCommunity.get(w.community_id) ?? 0,
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
