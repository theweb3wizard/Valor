import { transferUsdcFromCommunity } from '@/lib/chain/usdc';

export interface ExecuteTipParams {
  communityId: string;
  treasuryWalletAddress: string;
  contributorWalletAddress: string;
  amount: number;
  idempotencyKey: string;
}

export async function executeTip(
  params: ExecuteTipParams
): Promise<{ success: boolean; transferId: string; txHash: string | null; error?: string }> {
  const result = await transferUsdcFromCommunity(
    params.communityId,
    params.contributorWalletAddress,
    params.amount
  );

  return {
    success: result.success,
    transferId: result.txHash ?? '',
    txHash: result.txHash,
    error: result.error,
  };
}

export interface ExecuteWithdrawalParams {
  communityId: string;
  contributorWalletAddress: string;
  destinationAddress: string;
  amount: number;
}

export async function executeWithdrawal(
  params: ExecuteWithdrawalParams
): Promise<{ success: boolean; txHash: string | null; error?: string }> {
  return transferUsdcFromCommunity(
    params.communityId,
    params.destinationAddress,
    params.amount
  );
}
