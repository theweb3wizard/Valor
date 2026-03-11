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
  } catch (error: any) {
    console.error('[Admin API] Failed to load wallet data:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
