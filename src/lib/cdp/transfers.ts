import { transferUsdc } from '@/lib/chain/usdc';

export interface ExecuteTipParams {
  treasuryWalletAddress: string;
  contributorWalletAddress: string;
  amount: number;
  idempotencyKey: string;
}

export async function executeTip(
  params: ExecuteTipParams
): Promise<{ success: boolean; transferId: string; txHash: string | null; error?: string }> {
  const result = await transferUsdc({
    to: params.contributorWalletAddress,
    amount: params.amount,
  });

  return {
    success: result.success,
    transferId: result.txHash ?? '',
    txHash: result.txHash,
    error: result.error,
  };
}

export interface ExecuteWithdrawalParams {
  contributorWalletAddress: string;
  destinationAddress: string;
  amount: number;
}

export async function executeWithdrawal(
  params: ExecuteWithdrawalParams
): Promise<{ success: boolean; txHash: string | null; error?: string }> {
  return transferUsdc({
    to: params.destinationAddress,
    amount: params.amount,
  });
}
