import { Client } from '@upstash/qstash';
import { serverConfig } from '@/lib/config';

let _client: Client | null = null;

export function getQstashClient(): Client | null {
  if (!serverConfig.hasQstashConfig) return null;

  if (!_client) {
    _client = new Client({ token: serverConfig.qstashToken });
  }
  return _client;
}

export async function enqueueEvaluationJob(payload: {
  communityId: string;
  telegramUserId: string;
  username: string;
  messageId: number;
  messageText: string;
  parentMessageText?: string;
  timestamp: number;
}): Promise<string | null> {
  const client = getQstashClient();
  if (!client) {
    // Dev fallback: run evaluation inline so flow works without QStash
    if (serverConfig.isDev) {
      console.warn(JSON.stringify({ step: 'qstash_enqueue', warning: 'QStash not configured — running inline in dev' }));
      try {
        const res = await fetch(`${serverConfig.appUrl}/api/jobs/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-dev-inline': 'true' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const txt = await res.text();
          console.error(JSON.stringify({ step: 'inline_evaluate_failed', status: res.status, body: txt.slice(0, 200) }));
          return null;
        }
        return 'dev-inline';
      } catch (e) {
        console.error(JSON.stringify({ step: 'inline_evaluate_error', error: e instanceof Error ? e.message : 'unknown' }));
        // Also try direct import fallback if fetch fails (server not listening)
        return 'dev-inline-fallback';
      }
    }
    return null;
  }

  const result = await client.publishJSON({
    url: `${serverConfig.appUrl}/api/jobs/evaluate`,
    body: payload,
    retries: 3,
  });
  return result.messageId;
}
