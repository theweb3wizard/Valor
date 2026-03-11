import { NextResponse } from 'next/server';
import { getMasterWalletAddress, getMasterWalletBalance } from '@/lib/wdk';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const masterAddress = await getMasterWalletAddress();
    const balance = await getMasterWalletBalance();

    return NextResponse.json({
      masterAddress,
      balance,
      network: 'Sepolia Testnet',
      tokenContract: '0xd077a400968890eacc75cdc901f0356c943e4fdb',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin API] Failed to load wallet data:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}