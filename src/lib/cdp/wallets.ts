import { getCdpClient, getCdpNetwork, USDC_CONTRACT_ADDRESS } from '@/lib/cdp/client';
import { createServiceSupabase } from '@/lib/supabase/server';

export async function createCommunityTreasury(communityId: string): Promise<{
  walletId: string;
  address: string;
} | null> {
  const cdp = getCdpClient();
  if (!cdp) return null;
  const account = await cdp.evm.createAccount({ name: `treasury-${communityId}` });
  const networkAccount = await account.useNetwork(getCdpNetwork() as 'base');

  const supabase = createServiceSupabase();
  const { error } = await supabase
    .from('communities')
    .update({
      treasury_wallet_id: account.name ?? account.address,
      treasury_address: networkAccount.address,
    })
    .eq('id', communityId);

  if (error) throw new Error(`Failed to update community treasury: ${error.message}`);

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
  const supabase = createServiceSupabase();

  const { data: existing } = await supabase
    .from('wallets')
    .select('*')
    .eq('community_id', communityId)
    .eq('telegram_user_id', telegramUserId)
    .single();

  if (existing) {
    return { cdpWalletId: existing.cdp_wallet_id, walletAddress: existing.wallet_address };
  }

  const cdp = getCdpClient();
  if (!cdp) return null;
  const account = await cdp.evm.createAccount({
    name: `contributor-${communityId}-${telegramUserId}`,
  });
  const networkAccount = await account.useNetwork(getCdpNetwork() as 'base');

  const { data: inserted, error } = await supabase
    .from('wallets')
    .insert({
      community_id: communityId,
      telegram_user_id: telegramUserId,
      username,
      cdp_wallet_id: account.name ?? account.address,
      wallet_address: networkAccount.address,
    })
    .select()
    .single();

  if (error && error.code === '23505') {
    const { data: retry } = await supabase
      .from('wallets')
      .select('*')
      .eq('community_id', communityId)
      .eq('telegram_user_id', telegramUserId)
      .single();

    if (retry) {
      return { cdpWalletId: retry.cdp_wallet_id, walletAddress: retry.wallet_address };
    }
  }

  if (error) throw new Error(`Failed to insert wallet: ${error.message}`);

  return {
    cdpWalletId: inserted!.cdp_wallet_id,
    walletAddress: inserted!.wallet_address,
  };
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
  const supabase = createServiceSupabase();

  const { data: community, error } = await supabase
    .from('communities')
    .select('treasury_address')
    .eq('id', communityId)
    .single();

  if (error || !community?.treasury_address) return;

  const balance = await getWalletBalance(community.treasury_address);
  const divisor = 10n ** 6n;
  const usdcAmount = Number(balance / divisor);

  await supabase
    .from('communities')
    .update({ usdc_balance: usdcAmount })
    .eq('id', communityId);
}
