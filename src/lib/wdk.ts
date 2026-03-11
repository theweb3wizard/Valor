/**
 * wdk.ts — Valor WDK Integration
 *
 * Handles all wallet operations using @tetherto/wdk-wallet-evm-erc-4337.
 * All contributor wallets are derived deterministically from WDK_MASTER_SEED.
 * Nothing sensitive is stored in Supabase — only addresses and account indexes.
 *
 * Architecture:
 *   Master seed (env var) → WalletManagerEvmErc4337
 *     index 0 → community treasury (sends tips)
 *     index 1+ → contributor wallets (receive tips)
 *
 * Network: Ethereum Sepolia testnet
 * Token: USDt on Sepolia — 0xd077a400968890eacc75cdc901f0356c943e4fdb
 */

import WalletManagerEvmErc4337 from '@tetherto/wdk-wallet-evm-erc-4337';
import { supabase } from '@/lib/supabase';

// ─── Constants ───────────────────────────────────────────────────────────────

// USDt contract address on Sepolia testnet
const USDT_SEPOLIA = '0xd077a400968890eacc75cdc901f0356c943e4fdb';

// Sepolia chain ID
const SEPOLIA_CHAIN_ID = 11155111;

// Pimlico public endpoint — no API key required for testnet
const PIMLICO_URL = `https://public.pimlico.io/v2/${SEPOLIA_CHAIN_ID}/rpc`;

// ERC-4337 EntryPoint v0.7
const ENTRY_POINT = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

// Pimlico paymaster address on Sepolia
const PAYMASTER_ADDRESS = '0x777777777777AeC03fd955926DbF81597e66834C';

// USDT has 6 decimals. 1 USDT = 1_000_000 units.
const USDT_DECIMALS = 6;

// ─── WDK Config ──────────────────────────────────────────────────────────────

function getSepoliaConfig() {
  return {
    chainId: SEPOLIA_CHAIN_ID,
    blockchain: 'ethereum' as const,
    provider: 'https://sepolia.drpc.org',
    bundlerUrl: PIMLICO_URL,
    paymasterUrl: PIMLICO_URL,
    paymasterAddress: PAYMASTER_ADDRESS,
    entryPointAddress: ENTRY_POINT,
    safeModulesVersion: '0.3.0',
    paymasterToken: {
      address: USDT_SEPOLIA,
    },
    transferMaxFee: 100000, // 0.1 USDt max gas per tx (6 decimals)
  };
}

// ─── Wallet Manager Singleton ─────────────────────────────────────────────────

let _walletManager: InstanceType<typeof WalletManagerEvmErc4337> | null = null;

function getWalletManager(): InstanceType<typeof WalletManagerEvmErc4337> {
  if (_walletManager) return _walletManager;

  const seed = process.env.WDK_MASTER_SEED;
  if (!seed) {
    throw new Error('[WDK] WDK_MASTER_SEED environment variable is not set.');
  }

  _walletManager = new WalletManagerEvmErc4337(seed, getSepoliaConfig());
  console.log('[WDK] WalletManager initialized (Sepolia, ERC-4337)');
  return _walletManager;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the master wallet address (index 0).
 * This is the community treasury — admins deposit USDt here.
 */
export async function getMasterWalletAddress(): Promise<string> {
  const manager = getWalletManager();
  const account = await manager.getAccount(0);
  const address = await account.getAddress();
  console.log(`[WDK] Master wallet address: ${address}`);
  return address;
}

/**
 * Returns the current USDt balance of the master wallet.
 * Used by the dashboard to show available funds.
 */
export async function getMasterWalletBalance(): Promise<number> {
  const manager = getWalletManager();
  const account = await manager.getAccount(0);
  const rawBalance = await account.getTokenBalance(USDT_SEPOLIA);
  const balance = Number(rawBalance) / Math.pow(10, USDT_DECIMALS);
  console.log(`[WDK] Master wallet USDt balance: ${balance}`);
  return balance;
}

/**
 * Gets or creates a contributor wallet for a given username.
 *
 * Strategy: deterministic derivation from master seed.
 * - If wallet exists in Supabase → return stored address
 * - If not → derive next available index, store address + index, return address
 *
 * Nothing sensitive is stored — only the wallet address and account index.
 */
export async function getOrCreateContributorWallet(
  username: string,
  communityId: string
): Promise<{ address: string; isNew: boolean }> {
  // Check if wallet already exists
  const { data: existing, error: fetchError } = await supabase
    .from('wallets')
    .select('wallet_address, account_index')
    .eq('username', username)
    .eq('community_id', communityId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error(`[WDK] Error fetching wallet for @${username}:`, fetchError.message);
  }

  if (existing?.wallet_address) {
    console.log(`[WDK] Existing wallet for @${username}: ${existing.wallet_address} (index ${existing.account_index})`);
    return { address: existing.wallet_address, isNew: false };
  }

  // No wallet yet — derive next available index
  // Index 0 is reserved for the master/treasury wallet
  const { data: allWallets, error: countError } = await supabase
    .from('wallets')
    .select('account_index')
    .eq('community_id', communityId)
    .order('account_index', { ascending: false })
    .limit(1);

  if (countError) {
    console.error('[WDK] Error fetching wallet count:', countError.message);
  }

  // Next index: if no contributor wallets exist yet, start at 1 (0 is master)
  const lastIndex = allWallets?.[0]?.account_index ?? 0;
  const newIndex = Math.max(lastIndex + 1, 1);

  const manager = getWalletManager();
  const account = await manager.getAccount(newIndex);
  const newAddress = await account.getAddress();

  // Store in Supabase — address and index only, never the seed or private key
  const { error: insertError } = await supabase.from('wallets').insert({
    community_id: communityId,
    username,
    wallet_address: newAddress,
    account_index: newIndex,
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error(`[WDK] Failed to store wallet for @${username}:`, insertError.message);
    throw new Error(`Failed to create wallet for @${username}`);
  }

  console.log(`[WDK] ✅ New wallet created for @${username}: ${newAddress} (index ${newIndex})`);
  return { address: newAddress, isNew: true };
}

/**
 * Sends a USDt tip from the master wallet to a contributor address.
 * Returns the transaction hash on success.
 *
 * @param recipientAddress - The contributor's wallet address
 * @param amountUsdt - Amount in USDT (e.g. 2 for 2 USDT)
 */
export async function sendUsdtTip(
  recipientAddress: string,
  amountUsdt: number
): Promise<{ txHash: string; fee: bigint }> {
  const manager = getWalletManager();
  const masterAccount = await manager.getAccount(0);

  // Convert USDT amount to base units (6 decimals)
  const amountRaw = BigInt(Math.round(amountUsdt * Math.pow(10, USDT_DECIMALS)));

  console.log(`[WDK] Sending ${amountUsdt} USDt → ${recipientAddress} (${amountRaw} raw units)`);

  const result = await masterAccount.transfer({
    token: USDT_SEPOLIA,
    recipient: recipientAddress,
    amount: amountRaw,
  });

  console.log(`[WDK] ✅ Transfer confirmed — hash: ${result.hash} | fee: ${result.fee} wei`);
  return { txHash: result.hash, fee: result.fee };
}

/**
 * Gets the USDt balance of a contributor wallet by username.
 * Returns 0 if wallet doesn't exist yet.
 */
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

  const manager = getWalletManager();

  // Use read-only check — no need to load full account for balance check
  const { WalletAccountReadOnlyEvm } = await import('@tetherto/wdk-wallet-evm');
  const readOnly = new WalletAccountReadOnlyEvm(wallet.wallet_address, {
    provider: 'https://sepolia.drpc.org',
  });

  const rawBalance = await readOnly.getTokenBalance(USDT_SEPOLIA);
  const balance = Number(rawBalance) / Math.pow(10, USDT_DECIMALS);
  console.log(`[WDK] Balance for @${username}: ${balance} USDt`);
  return balance;
}

/**
 * Withdraws USDt from a contributor's Valor wallet to their external address.
 * Called from the /withdraw page.
 *
 * @param username - Contributor's Telegram username
 * @param communityId - Community ID
 * @param destinationAddress - External wallet address to send to
 * @param amountUsdt - Amount to withdraw (use getContributorBalance to get max)
 */
export async function withdrawContributorFunds(
  username: string,
  communityId: string,
  destinationAddress: string,
  amountUsdt: number
): Promise<{ txHash: string }> {
  // Get contributor's account index
  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('account_index')
    .eq('username', username)
    .eq('community_id', communityId)
    .single();

  if (error || !wallet) {
    throw new Error(`No wallet found for @${username}`);
  }

  const manager = getWalletManager();
  const contributorAccount = await manager.getAccount(wallet.account_index);

  const amountRaw = BigInt(Math.round(amountUsdt * Math.pow(10, USDT_DECIMALS)));

  console.log(`[WDK] Withdraw: @${username} → ${destinationAddress} | ${amountUsdt} USDt`);

  const result = await contributorAccount.transfer({
    token: USDT_SEPOLIA,
    recipient: destinationAddress,
    amount: amountRaw,
  });

  console.log(`[WDK] ✅ Withdrawal confirmed — hash: ${result.hash}`);
  return { txHash: result.hash };
}