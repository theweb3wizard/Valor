import { CdpClient } from '@coinbase/cdp-sdk';
import { serverConfig } from '@/lib/config';

let _client: CdpClient | null = null;

export function getCdpClient(): CdpClient | null {
  if (!serverConfig.hasCdpConfig) return null;

  if (!_client) {
    _client = new CdpClient({
      apiKeyId: serverConfig.cdpApiKeyName,
      apiKeySecret: serverConfig.cdpApiKeyPrivateKey,
    });
  }
  return _client;
}

export const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export function getCdpNetwork(): string {
  return serverConfig.cdpNetworkId;
}
