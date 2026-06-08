import { parseUnits } from 'viem';
import { getCdpClient, getCdpNetwork } from '@/lib/cdp/client';

export interface ExecuteTipParams {
  treasuryWalletAddress: string;
  contributorWalletAddress: string;
  amount: number;
  idempotencyKey: string;
}

export async function executeTip(
  params: ExecuteTipParams
): Promise<{ success: boolean; transferId: string; txHash: string | null; error?: string }> {
  try {
    const cdp = getCdpClient();
    if (!cdp) return { success: false, transferId: '', txHash: null, error: 'CDP not configured' };
    const account = await cdp.evm.getAccount({
      address: params.treasuryWalletAddress as `0x${string}`,
    });
    const networkAccount = await account.useNetwork(getCdpNetwork() as 'base');

    const amountAtomic = parseUnits(params.amount.toString(), 6);

    const { transactionHash } = await networkAccount.transfer({
      to: params.contributorWalletAddress as `0x${string}`,
      amount: amountAtomic,
      token: 'usdc',
    });

    return {
      success: true,
      transferId: transactionHash,
      txHash: transactionHash,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown CDP error';
    return { success: false, transferId: '', txHash: null, error: message };
  }
}

export interface ExecuteWithdrawalParams {
  contributorWalletAddress: string;
  destinationAddress: string;
  amount: number;
}

export async function executeWithdrawal(
  params: ExecuteWithdrawalParams
): Promise<{ success: boolean; txHash: string | null; error?: string }> {
  try {
    const cdp = getCdpClient();
    if (!cdp) return { success: false, txHash: null, error: 'CDP not configured' };
    const account = await cdp.evm.getAccount({
      address: params.contributorWalletAddress as `0x${string}`,
    });
    const networkAccount = await account.useNetwork(getCdpNetwork() as 'base');

    const amountAtomic = parseUnits(params.amount.toString(), 6);

    const { transactionHash } = await networkAccount.transfer({
      to: params.destinationAddress as `0x${string}`,
      amount: amountAtomic,
      token: 'usdc',
    });

    return { success: true, txHash: transactionHash };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown CDP error';
    return { success: false, txHash: null, error: message };
  }
}
