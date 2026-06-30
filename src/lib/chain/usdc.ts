import { parseUnits, erc20Abi } from 'viem';
import { base } from 'viem/chains';
import { getTreasuryAccount, getTreasuryWalletClient, publicClient, USDC_CONTRACT_ADDRESS } from './client';

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

export interface TransferUsdcParams {
  to: string;
  amount: number;
}

export async function transferUsdc(params: TransferUsdcParams): Promise<{
  success: boolean;
  txHash: string | null;
  error?: string;
}> {
  try {
    const walletClient = getTreasuryWalletClient();
    if (!walletClient) {
      return { success: false, txHash: null, error: 'treasury not configured' };
    }

    const amountAtomic = parseUnits(params.amount.toString(), 6);

    const account = getTreasuryAccount();
    if (!account) {
      return { success: false, txHash: null, error: 'treasury not configured' };
    }
    const txHash = await walletClient.writeContract({
      chain: base,
      account,
      address: USDC_CONTRACT_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [params.to as `0x${string}`, amountAtomic],
    });

    return { success: true, txHash };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, txHash: null, error: message };
  }
}
