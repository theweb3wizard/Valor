import { NextRequest, NextResponse } from 'next/server';
import { withdrawContributorFunds, getContributorBalance } from '@/lib/wdk';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, communityId, destinationAddress, amount } = body;

    // ── Validate inputs ──────────────────────────────────────────────────────
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'username is required.' }, { status: 400 });
    }
    if (!communityId || typeof communityId !== 'string') {
      return NextResponse.json({ error: 'communityId is required.' }, { status: 400 });
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

    // ── Check available balance ──────────────────────────────────────────────
    const balance = await getContributorBalance(username, communityId);
    if (balance <= 0) {
      return NextResponse.json({ error: 'No USDT balance available to withdraw.' }, { status: 400 });
    }
    if (amount > balance) {
      return NextResponse.json({
        error: `Insufficient balance. Available: ${balance.toFixed(2)} USDT.`
      }, { status: 400 });
    }

    // ── Execute withdrawal via WDK ───────────────────────────────────────────
    console.log(`[Withdraw API] ${username} withdrawing ${amount} USDT → ${destinationAddress}`);
    const { txHash } = await withdrawContributorFunds(
      username,
      communityId,
      destinationAddress,
      amount
    );

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

// ── GET: Check contributor balance ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    const communityId = searchParams.get('communityId');

    if (!username || !communityId) {
      return NextResponse.json(
        { error: 'username and communityId are required.' },
        { status: 400 }
      );
    }

    const balance = await getContributorBalance(username, communityId);
    return NextResponse.json({ username, balance });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}