import { deriveCommunityAccount, USDC_CONTRACT_ADDRESS } from '@/lib/chain/client';
import { getUsdcBalance } from '@/lib/chain/usdc';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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
