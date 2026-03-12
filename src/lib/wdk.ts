/**
 * wdk.ts — Valor WDK Integration
 *
 * Uses @tetherto/wdk-wallet-evm (standard EVM, no ERC-4337).
 * No native binary dependencies — works cleanly in Vercel serverless.
 *
 * Architecture:
 *   Master seed (env var) → WalletManagerEvm
 *     index 0 → community treasury (sends tips + seeds gas)
 *     index 1+ → contributor wallets (receive tips, pre-funded with ETH for withdrawals)
 *
 * Network: Ethereum Sepolia testnet
 * Token:   USDt on Sepolia — 0xd077a400968890eacc75cdc901f0356c943e4fdb
 * Gas:     Paid in Sepolia ETH from master wallet
 */

import WalletManagerEvm, { WalletAccountReadOnlyEvm } from '@tetherto/wdk-wallet-evm';
import { HDNodeWallet, JsonRpcProvider, parseEther } from 'ethers';
import { supabase } from '@/lib/supabase';

// ─── Constants ───────────────────────────────────────────────────────────────

const USDT_SEPOLIA = '0xd077a400968890eacc75cdc901f0356c943e4fdb';
const USDT_DECIMALS = 6;
const SEPOLIA_RPC = 'https://sepolia.drpc.org';
const TRANSFER_MAX_FEE = BigInt('5000000000000000'); // 0.005 ETH max gas per tx

// ETH seeded into every new contributor wallet so they can withdraw later.
// 0.005 ETH covers ~50 withdrawal transactions at current Sepolia gas prices.
const GAS_SEED_ETH = '0.005';

// Standard BIP-44 Ethereum path — same path WDK uses for index 0.
const MASTER_ETH_PATH = "m/44'/60'/0'/0/0";

// ─── Wallet Manager Singleton ─────────────────────────────────────────────────

let _walletManager: WalletManagerEvm | null = null;

function getWalletManager(): WalletManagerEvm {
  if (_walletManager) return _walletManager;

  const seed = process.env.WDK_MASTER_SEED;
  if (!seed) throw new Error('[WDK] WDK_MASTER_SEED environment variable is not set.');

  _walletManager = new WalletManagerEvm(seed, {
    provider: SEPOLIA_RPC,
    transferMaxFee: TRANSFER_MAX_FEE,
  });

  console.log('[WDK] WalletManagerEvm initialized (Sepolia)');
  return _walletManager;
}

// ─── Internal: ETH gas seeding ───────────────────────────────────────────────

/**
 * Sends a small amount of Sepolia ETH from the master wallet to a new
 * contributor wallet so they can pay gas on their first withdrawal.
 * Uses ethers HDNodeWallet directly for native ETH transfer (WDK handles ERC-20 only).
 * Non-blocking — failure is logged but does not abort the USDT tip.
 */
async function seedContributorGas(recipientAddress: string): Promise<void> {
  const seed = process.env.WDK_MASTER_SEED;
  if (!seed) {
    console.error('[WDK] Cannot seed gas — WDK_MASTER_SEED not set.');
    return;
  }

  try {
    const provider = new JsonRpcProvider(SEPOLIA_RPC);
    const masterWallet = HDNodeWallet.fromPhrase(seed, undefined, MASTER_ETH_PATH).connect(provider);

    console.log(`[WDK] Seeding ${GAS_SEED_ETH} ETH → ${recipientAddress} for withdrawal gas...`);

    const tx = await masterWallet.sendTransaction({
      to: recipientAddress,
      value: parseEther(GAS_SEED_ETH),
    });

    // Wait for one confirmation before proceeding
    await tx.wait(1);
    console.log(`[WDK] ✅ Gas seeded — tx: ${tx.hash}`);
  } catch (err) {
    // Non-fatal — USDT tip proceeds regardless. Contributor can still receive tip;
    // they just won't be able to withdraw until gas is added manually.
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[WDK] ⚠️ Gas seed failed for ${recipientAddress}: ${msg}`);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getMasterWalletAddress(): Promise<string> {
  const account = await getWalletManager().getAccount(0);
  const address = await account.getAddress();
  console.log(`[WDK] Master wallet address: ${address}`);
  return address;
}

export async function getMasterWalletBalance(): Promise<number> {
  const account = await getWalletManager().getAccount(0);
  const raw = await account.getTokenBalance(USDT_SEPOLIA);
  const balance = Number(raw) / Math.pow(10, USDT_DECIMALS);
  console.log(`[WDK] Master wallet USDt balance: ${balance}`);
  return balance;
}

export async function getOrCreateContributorWallet(
  username: string,
  communityId: string
): Promise<{ address: string; isNew: boolean }> {
  const { data: existing, error: fetchError } = await supabase
    .from('wallets')
    .select('wallet_address, account_index')
    .eq('username', username)
    .eq('community_id', communityId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error(`[WDK] Error fetching wallet for ${username}:`, fetchError.message);
  }

  if (existing?.wallet_address) {
    console.log(`[WDK] Existing wallet for ${username}: ${existing.wallet_address} (index ${existing.account_index})`);
    return { address: existing.wallet_address, isNew: false };
  }

  // ─── Create new wallet ────────────────────────────────────────────────────
  const { data: allWallets, error: countError } = await supabase
    .from('wallets')
    .select('account_index')
    .eq('community_id', communityId)
    .order('account_index', { ascending: false })
    .limit(1);

  if (countError) console.error('[WDK] Error fetching wallet count:', countError.message);

  const lastIndex = allWallets?.[0]?.account_index ?? 0;
  const newIndex = Math.max(lastIndex + 1, 1);

  const account = await getWalletManager().getAccount(newIndex);
  const newAddress = await account.getAddress();

  const { error: insertError } = await supabase.from('wallets').insert({
    community_id: communityId,
    username,
    wallet_address: newAddress,
    account_index: newIndex,
    registered_at: new Date().toISOString(),
  });

  if (insertError) throw new Error(`Failed to create wallet for ${username}: ${insertError.message}`);

  console.log(`[WDK] ✅ New wallet for ${username}: ${newAddress} (index ${newIndex})`);

  // ─── Seed gas ETH so contributor can withdraw later ───────────────────────
  // This runs after DB insert so wallet creation is never blocked by gas seeding.
  await seedContributorGas(newAddress);

  return { address: newAddress, isNew: true };
}

export async function sendUsdtTip(
  recipientAddress: string,
  amountUsdt: number
): Promise<{ txHash: string; fee: bigint }> {
  const account = await getWalletManager().getAccount(0);
  const amountRaw = BigInt(Math.round(amountUsdt * Math.pow(10, USDT_DECIMALS)));

  console.log(`[WDK] Sending ${amountUsdt} USDt → ${recipientAddress}`);

  const result = await account.transfer({
    token: USDT_SEPOLIA,
    recipient: recipientAddress,
    amount: amountRaw,
  });

  console.log(`[WDK] ✅ Transfer confirmed — hash: ${result.hash} | fee: ${result.fee}`);
  return { txHash: result.hash, fee: result.fee };
}

export async function getContributorBalance(
  username: string,
  communityId: string
): Promise<number> {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('wallet_address')
    .eq('username', username)
    .eq('community_id', communityId)
    .single();

  if (!wallet?.wallet_address) return 0;

  const readOnly = new WalletAccountReadOnlyEvm(wallet.wallet_address, {
    provider: SEPOLIA_RPC,
  });

  const raw = await readOnly.getTokenBalance(USDT_SEPOLIA);
  const balance = Number(raw) / Math.pow(10, USDT_DECIMALS);
  console.log(`[WDK] Balance for ${username}: ${balance} USDt`);
  return balance;
}

export async function withdrawContributorFunds(
  username: string,
  communityId: string,
  destinationAddress: string,
  amountUsdt: number
): Promise<{ txHash: string }> {
  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('account_index')
    .eq('username', username)
    .eq('community_id', communityId)
    .single();

  if (error || !wallet) throw new Error(`No wallet found for ${username}`);

  const account = await getWalletManager().getAccount(wallet.account_index);
  const amountRaw = BigInt(Math.round(amountUsdt * Math.pow(10, USDT_DECIMALS)));

  console.log(`[WDK] Withdraw: ${username} → ${destinationAddress} | ${amountUsdt} USDt`);

  const result = await account.transfer({
    token: USDT_SEPOLIA,
    recipient: destinationAddress,
    amount: amountRaw,
  });

  console.log(`[WDK] ✅ Withdrawal confirmed — hash: ${result.hash}`);
  return { txHash: result.hash };
}