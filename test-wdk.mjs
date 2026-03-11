/**
 * test-wdk.mjs — Run once to verify WDK is working
 *
 * Usage (in Firebase Studio terminal):
 *   WDK_MASTER_SEED="your twelve words here" node test-wdk.mjs
 *
 * What it does:
 *   1. Initializes WDK with your seed phrase
 *   2. Derives the master wallet address (index 0)
 *   3. Prints the address — this is where you send testnet USDt
 *
 * Expected output:
 *   [WDK Test] Master wallet address: 0x...
 *   [WDK Test] ✅ WDK is working. Fund this address with testnet USDt.
 *   [WDK Test] Sepolia Etherscan: https://sepolia.etherscan.io/address/0x...
 */

import WalletManagerEvmErc4337 from '@tetherto/wdk-wallet-evm-erc-4337';

const seed = process.env.WDK_MASTER_SEED;

if (!seed) {
  console.error('[WDK Test] ERROR: WDK_MASTER_SEED is not set.');
  console.error('[WDK Test] Run as: WDK_MASTER_SEED="your twelve words" node test-wdk.mjs');
  process.exit(1);
}

const SEPOLIA_CHAIN_ID = 11155111;
const PIMLICO_URL = `https://public.pimlico.io/v2/${SEPOLIA_CHAIN_ID}/rpc`;

const config = {
  chainId: SEPOLIA_CHAIN_ID,
  blockchain: 'ethereum',
  provider: 'https://sepolia.drpc.org',
  bundlerUrl: PIMLICO_URL,
  paymasterUrl: PIMLICO_URL,
  paymasterAddress: '0x777777777777AeC03fd955926DbF81597e66834C',
  entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  safeModulesVersion: '0.3.0',
  paymasterToken: {
    address: '0xd077a400968890eacc75cdc901f0356c943e4fdb',
  },
  transferMaxFee: 100000,
};

try {
  console.log('[WDK Test] Initializing WalletManager...');
  const manager = new WalletManagerEvmErc4337(seed, config);

  console.log('[WDK Test] Deriving master wallet (index 0)...');
  const account = await manager.getAccount(0);
  const address = await account.getAddress();

  console.log(`\n[WDK Test] Master wallet address: ${address}`);
  console.log(`[WDK Test] ✅ WDK is working. Fund this address with testnet USDt.`);
  console.log(`[WDK Test] Sepolia Etherscan: https://sepolia.etherscan.io/address/${address}`);
  console.log(`\n[WDK Test] Next steps:`);
  console.log(`  1. Copy your master address above`);
  console.log(`  2. Get testnet ETH: https://sepoliafaucet.com`);
  console.log(`  3. Get testnet USDt from Pimlico faucet or Candide`);
  console.log(`  4. Come back and confirm you have funds`);

  manager.dispose();
} catch (err) {
  console.error('[WDK Test] ERROR:', err.message);
  console.error('[WDK Test] Full error:', err);
  process.exit(1);
}
