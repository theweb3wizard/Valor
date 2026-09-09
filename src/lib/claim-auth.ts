import { createHmac } from 'node:crypto';
import { serverConfig } from '@/lib/config';

export function computeClaimSignature(telegramUserId: string): string {
  const secret = serverConfig.cronSecret || 'dev-claim-secret';
  return createHmac('sha256', secret).update(telegramUserId).digest('hex').slice(0, 16);
}

export function verifyClaimSignature(telegramUserId: string, sig: string | null): boolean {
  if (!sig) {
    // In dev, allow unsigned for out-of-box testing
    if (serverConfig.isDev) return true;
    return false;
  }
  const expected = computeClaimSignature(telegramUserId);
  // constant-time-ish compare
  if (expected.length !== sig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return mismatch === 0;
}

export function buildClaimUrl(baseUrl: string, telegramUserId: string): string {
  const sig = computeClaimSignature(telegramUserId);
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}user=${encodeURIComponent(telegramUserId)}&sig=${sig}`;
}
