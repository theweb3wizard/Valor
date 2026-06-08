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
  if (!client) return null;

  const result = await client.publishJSON({
    url: `${serverConfig.appUrl}/api/jobs/evaluate`,
    body: payload,
    retries: 3,
  });
  return result.messageId;
}
