import { parseUnits, erc20Abi } from 'viem';
import { base } from 'viem/chains';
import { getCommunityWalletClient, deriveCommunityAccount, publicClient, USDC_CONTRACT_ADDRESS } from './client';

export async function getUsdcBalance(address: string): Promise<bigint> {
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

export async function transferUsdcFromCommunity(
  communityId: string,
  to: string,
  amount: number
): Promise<{ success: boolean; txHash: string | null; error?: string }> {
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
    return { success: false, txHash: null, error: message };
  }
}
