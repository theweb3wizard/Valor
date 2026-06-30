import { getCdpClient, getCdpNetwork, USDC_CONTRACT_ADDRESS } from '@/lib/cdp/client';
import { getDb } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function createCommunityTreasury(communityId: string): Promise<{
  walletId: string;
  address: string;
} | null> {
  const cdp = getCdpClient();
  if (!cdp) return null;
  const account = await cdp.evm.createAccount({ name: `treasury-${communityId}` });
  const networkAccount = await account.useNetwork(getCdpNetwork() as 'base');

  const db = getDb();
  if (!db) return null;
  await db.update(schema.communities)
    .set({
      treasuryWalletId: account.name ?? account.address,
      treasuryAddress: networkAccount.address,
    })
    .where(eq(schema.communities.id, communityId));

  return {
    walletId: account.name ?? account.address,
    address: networkAccount.address,
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
    return { cdpWalletId: existing.cdpWalletId, walletAddress: existing.walletAddress };
  }

  const cdp = getCdpClient();
  if (!cdp) return null;
  const account = await cdp.evm.createAccount({
    name: `contributor-${communityId}-${telegramUserId}`,
  });
  const networkAccount = await account.useNetwork(getCdpNetwork() as 'base');

  try {
    const [inserted] = await db.insert(schema.wallets)
      .values({
        communityId,
        telegramUserId,
        username,
        cdpWalletId: account.name ?? account.address,
        walletAddress: networkAccount.address,
      })
      .returning();
    return { cdpWalletId: inserted.cdpWalletId, walletAddress: inserted.walletAddress };
  } catch (err: any) {
    if (err.code === '23505') {
      const [retry] = await db.select()
        .from(schema.wallets)
        .where(
          and(
            eq(schema.wallets.communityId, communityId),
            eq(schema.wallets.telegramUserId, telegramUserId)
          )
        );
      if (retry) {
        return { cdpWalletId: retry.cdpWalletId, walletAddress: retry.walletAddress };
      }
    }
    throw new Error(`Failed to insert wallet: ${err.message}`);
  }
}

export async function getWalletBalance(walletAddress: string): Promise<bigint> {
  const cdp = getCdpClient();
  if (!cdp) return 0n;
  try {
    const balances = await cdp.evm.listTokenBalances({
      address: walletAddress as `0x${string}`,
      network: getCdpNetwork() as 'base',
    });
    const usdcBalance = (balances as unknown as { data: Array<{ token: { contractAddress: string }; amount: { amount: bigint } }> }).data.find(
      (b) => b.token.contractAddress.toLowerCase() === USDC_CONTRACT_ADDRESS.toLowerCase()
    );
    return usdcBalance?.amount.amount ?? 0n;
  } catch {
    return 0n;
  }
}

export async function refreshTreasuryBalance(communityId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const [community] = await db.select({ treasuryAddress: schema.communities.treasuryAddress })
    .from(schema.communities)
    .where(eq(schema.communities.id, communityId));

  if (!community?.treasuryAddress) return;

  const balance = await getWalletBalance(community.treasuryAddress);
  const divisor = 10n ** 6n;
  const usdcAmount = Number(balance / divisor);

  await db.update(schema.communities)
    .set({ usdcBalance: String(usdcAmount) })
    .where(eq(schema.communities.id, communityId));
}
