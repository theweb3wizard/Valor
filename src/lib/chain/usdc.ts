import { parseUnits, erc20Abi } from 'viem';
import { base } from 'viem/chains';
import { getCommunityWalletClient, deriveCommunityAccount, publicClient, USDC_CONTRACT_ADDRESS } from './client';
import { serverConfig } from '@/lib/config';

export async function getUsdcBalance(address: string): Promise<bigint> {
  // Dev mock: when treasury not configured, simulate funded treasury for demo
  if (!serverConfig.hasTreasuryConfig && serverConfig.isDev) {
    return 1_000_000_000n; // 1000 USDC mock
  }
  try {
    const balance = await publicClient.readContract({
      address: USDC_CONTRACT_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });
    return balance;
  } catch {
    return 0n;
  }
}

function isValidPrivateKey(key: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(key);
}

export async function transferUsdcFromCommunity(
  communityId: string,
  to: string,
  amount: number
): Promise<{ success: boolean; txHash: string | null; error?: string }> {
  // Dev mock — no real chain interaction needed for demo/testing
  if (!serverConfig.hasTreasuryConfig || !isValidPrivateKey(serverConfig.treasuryPrivateKey)) {
    if (serverConfig.isDev) {
      const mockHash = `0x${'0'.repeat(62)}${Math.floor(Math.random() * 0xffffffff).toString(16).padStart(2, '0')}` as `0x${string}`;
      console.warn(JSON.stringify({ step: 'mock_transfer', communityId, to, amount, hint: 'TREASURY_PRIVATE_KEY missing/invalid — mock tx in dev' }));
      return { success: true, txHash: mockHash };
    }
    return { success: false, txHash: null, error: 'treasury not configured' };
  }

  try {
    const account = deriveCommunityAccount(communityId);
    if (!account) {
      return { success: false, txHash: null, error: 'treasury not configured' };
    }

    const walletClient = getCommunityWalletClient(communityId);
    if (!walletClient) {
      return { success: false, txHash: null, error: 'treasury not configured' };
    }

    const amountAtomic = parseUnits(amount.toString(), 6);

    const txHash = await walletClient.writeContract({
      chain: base,
      account,
      address: USDC_CONTRACT_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [to as `0x${string}`, amountAtomic],
    });

    return { success: true, txHash };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // In dev, don't break flow on RPC failure — simulate success for demo
    if (serverConfig.isDev && (message.includes('insufficient') || message.includes('timeout') || message.includes('network'))) {
      const mockHash = `0x${'0'.repeat(62)}aa` as `0x${string}`;
      console.warn(JSON.stringify({ step: 'mock_transfer_fallback', communityId, error: message }));
      return { success: true, txHash: mockHash };
    }
    return { success: false, txHash: null, error: message };
  }
}
