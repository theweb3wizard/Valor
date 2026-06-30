import { parseEther } from 'viem';
import { deriveCommunityAccount, getMasterWalletClient, USDC_CONTRACT_ADDRESS } from '@/lib/chain/client';
import { getUsdcBalance, transferUsdcFromCommunity } from '@/lib/chain/usdc';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

const GAS_SPONSORSHIP_AMOUNT = '0.0005';

export async function createCommunityTreasury(communityId: string): Promise<{
  walletId: string;
  address: string;
} | null> {
  const account = deriveCommunityAccount(communityId);
  if (!account) return null;

  const db = getDb();
  if (!db) return null;

  await db.update(schema.communities)
    .set({
      treasuryWalletId: account.address,
      treasuryAddress: account.address,
    })
    .where(eq(schema.communities.id, communityId));

  try {
    const masterWalletClient = getMasterWalletClient();
    if (masterWalletClient) {
      const tx = await masterWalletClient.sendTransaction({
        to: account.address,
        value: parseEther(GAS_SPONSORSHIP_AMOUNT),
      });
      console.log(
        JSON.stringify({
          step: 'gas_sponsorship',
          communityId,
          to: account.address,
          amount: GAS_SPONSORSHIP_AMOUNT,
          txHash: tx,
        })
      );
    }
  } catch (err) {
    console.warn(
      JSON.stringify({
        step: 'gas_sponsorship',
        communityId,
        error: err instanceof Error ? err.message : 'unknown',
        hint: 'master key may not be funded yet',
      })
    );
  }

  return {
    walletId: account.address,
    address: account.address,
  };
}

export async function getOrCreateContributorWallet(
  communityId: string,
  telegramUserId: string,
  username: string
): Promise<{
  cdpWalletId: string;
  walletAddress: string;
} | null> {
  const db = getDb();
  if (!db) return null;

  const [existing] = await db.select()
    .from(schema.wallets)
    .where(
      and(
        eq(schema.wallets.communityId, communityId),
        eq(schema.wallets.telegramUserId, telegramUserId)
      )
    );

  if (existing) {
    return { cdpWalletId: existing.cdpWalletId ?? '', walletAddress: existing.walletAddress };
  }

  return null;
}

export { getUsdcBalance as getWalletBalance };

export async function retryPendingTips(
  communityId: string,
  telegramUserId: string
): Promise<{ retried: number; succeeded: number; failed: number }> {
  const db = getDb();
  if (!db) return { retried: 0, succeeded: 0, failed: 0 };

  const [community] = await db
    .select({ treasuryAddress: schema.communities.treasuryAddress, name: schema.communities.name })
    .from(schema.communities)
    .where(eq(schema.communities.id, communityId))
    .limit(1);

  if (!community?.treasuryAddress) return { retried: 0, succeeded: 0, failed: 0 };

  const [wallet] = await db
    .select({ walletAddress: schema.wallets.walletAddress })
    .from(schema.wallets)
    .where(
      and(
        eq(schema.wallets.communityId, communityId),
        eq(schema.wallets.telegramUserId, telegramUserId)
      )
    )
    .limit(1);

  if (!wallet?.walletAddress) return { retried: 0, succeeded: 0, failed: 0 };

  const pendingTips = await db
    .select()
    .from(schema.tips)
    .where(
      and(
        eq(schema.tips.communityId, communityId),
        eq(schema.tips.telegramUserId, telegramUserId),
        eq(schema.tips.transactionStatus, 'pending'),
        eq(schema.tips.failureReason, 'no_wallet')
      )
    );

  if (pendingTips.length === 0) return { retried: 0, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;

  for (const tip of pendingTips) {
    const amount = Number(tip.amount);

    const balanceAtomic = await getUsdcBalance(community.treasuryAddress);
    const balanceUsdc = Number(balanceAtomic) / 1_000_000;

    if (balanceUsdc < amount + 0.5) {
      await db
        .update(schema.tips)
        .set({
          walletAddress: wallet.walletAddress,
          transactionStatus: 'failed',
          failureReason: 'insufficient_treasury',
        })
        .where(eq(schema.tips.id, tip.id));
      failed++;
      continue;
    }

    const result = await transferUsdcFromCommunity(communityId, wallet.walletAddress, amount);

    if (result.success) {
      await db
        .update(schema.tips)
        .set({
          walletAddress: wallet.walletAddress,
          txHash: result.txHash,
          transactionStatus: 'confirmed',
          failureReason: null,
        })
        .where(eq(schema.tips.id, tip.id));
      succeeded++;
    } else {
      const nonRetryable = result.error?.includes('insufficient')
        || result.error?.includes('invalid');

      if (!nonRetryable) {
        continue;
      }

      await db
        .update(schema.tips)
        .set({
          walletAddress: wallet.walletAddress,
          txHash: result.txHash,
          transactionStatus: 'failed',
          failureReason: result.error,
        })
        .where(eq(schema.tips.id, tip.id));
      failed++;
    }
  }

  if (succeeded > 0) {
    await refreshTreasuryBalance(communityId);
  }

  return { retried: pendingTips.length, succeeded, failed };
}

export async function refreshTreasuryBalance(communityId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const [community] = await db.select({ treasuryAddress: schema.communities.treasuryAddress })
    .from(schema.communities)
    .where(eq(schema.communities.id, communityId));

  if (!community?.treasuryAddress) return;

  const balance = await getUsdcBalance(community.treasuryAddress);
  const divisor = 10n ** 6n;
  const usdcAmount = Number(balance / divisor);

  await db.update(schema.communities)
    .set({ usdcBalance: String(usdcAmount) })
    .where(eq(schema.communities.id, communityId));
}
