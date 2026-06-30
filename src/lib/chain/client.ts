import { createWalletClient, createPublicClient, http, keccak256, encodePacked, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { serverConfig } from '@/lib/config';

export const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const USDC_DECIMALS = 6;

export function getMasterAccount() {
  if (!serverConfig.treasuryPrivateKey) return null;
  return privateKeyToAccount(serverConfig.treasuryPrivateKey as `0x${string}`);
}

export function getMasterWalletClient() {
  const account = getMasterAccount();
  if (!account) return null;
  return createWalletClient({
    account,
    chain: base,
    transport: http(),
  });
}

export function deriveCommunityAccount(communityId: string) {
  if (!serverConfig.treasuryPrivateKey) return null;

  const derivedKey = keccak256(
    encodePacked(
      ['bytes32', 'string'],
      [serverConfig.treasuryPrivateKey as `0x${string}`, communityId]
    )
  );

  return privateKeyToAccount(derivedKey);
}

export function getCommunityWalletClient(communityId: string) {
  const account = deriveCommunityAccount(communityId);
  if (!account) return null;

  return createWalletClient({
    account,
    chain: base,
    transport: http(),
  });
}
