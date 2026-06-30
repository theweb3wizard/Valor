import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { serverConfig } from '@/lib/config';

let _walletClient: ReturnType<typeof createWalletClient> | null = null;

export function getTreasuryAccount() {
  if (!serverConfig.treasuryPrivateKey) return null;
  return privateKeyToAccount(serverConfig.treasuryPrivateKey as `0x${string}`);
}

export function getTreasuryWalletClient() {
  const account = getTreasuryAccount();
  if (!account) return null;
  if (!_walletClient) {
    _walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });
  }
  return _walletClient;
}

export const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const USDC_DECIMALS = 6;
