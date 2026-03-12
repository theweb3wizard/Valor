import { NextRequest, NextResponse } from 'next/server';
import { withdrawContributorFunds, getContributorBalance } from '@/lib/wdk';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Auto-resolves communityId from the username's wallet record.
// The user never needs to know or enter their community ID.
async function resolveCommunityId(username: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('community_id')
    .eq('username', username)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.community_id;
}

// ── POST: Execute withdrawal ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, destinationAddress, amount } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'username is required.' }, { status: 400 });
    }
    if (!destinationAddress || typeof destinationAddress !== 'string') {
      return NextResponse.json({ error: 'destinationAddress is required.' }, { status: 400 });
    }
    if (!destinationAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json({ error: 'Invalid Ethereum address format.' }, { status: 400 });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number.' }, { status: 400 });
    }

    const communityId = await resolveCommunityId(username);
    if (!communityId) {
      return NextResponse.json(
        { error: 'No wallet found for this username. Have you received a tip yet?' },
        { status: 404 }
      );
    }

    const balance = await getContributorBalance(username, communityId);
    if (balance <= 0) {
      return NextResponse.json({ error: 'No USDT balance available to withdraw.' }, { status: 400 });
    }
    if (amount > balance) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ${balance.toFixed(2)} USDT.` },
        { status: 400 }
      );
    }

    console.log(`[Withdraw API] ${username} withdrawing ${amount} USDT → ${destinationAddress}`);
    const { txHash } = await withdrawContributorFunds(username, communityId, destinationAddress, amount);
    console.log(`[Withdraw API] ✅ Withdrawal confirmed — tx: ${txHash}`);

    return NextResponse.json({
      success: true,
      txHash,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
      amount,
      destinationAddress,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Withdraw API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── GET: Check contributor balance ───────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'username is required.' }, { status: 400 });
    }

    const communityId = await resolveCommunityId(username);
    if (!communityId) {
      return NextResponse.json({ username, balance: 0 });
    }

    const balance = await getContributorBalance(username, communityId);
    return NextResponse.json({ username, balance });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}