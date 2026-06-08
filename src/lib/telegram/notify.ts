interface SendTipAnnouncementParams {
  botToken: string;
  chatId: string;
  username: string;
  telegramUserId: string;
  amount: number;
  score: number;
  reason: string;
  txHash?: string;
  claimUrl: string;
}

interface SendTreasuryAlertParams {
  botToken: string;
  adminChatId: string;
  communityName: string;
  currentBalance: number;
  tipsRemaining: number;
}

interface SendWelcomeMessageParams {
  botToken: string;
  chatId: string;
}

interface SetBotWebhookParams {
  botToken: string;
  webhookUrl: string;
  secretToken: string;
}

interface DeleteBotWebhookParams {
  botToken: string;
}

async function telegramPost(
  botToken: string,
  method: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/${method}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, error: errBody };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

export async function sendTipAnnouncement(
  params: SendTipAnnouncementParams
): Promise<{ success: boolean; error?: string }> {
  const mention = params.username
    ? `@${params.username}`
    : `[User](tg://user?id=${params.telegramUserId})`;

  let message = `🏆 *Tip Awarded!*\n\n`;
  message += `${mention} earned *${params.amount} USDC* for their contribution!\n\n`;
  message += `Quality score: ${params.score}/10\n`;
  message += `_${escapeMarkdown(params.reason)}_\n\n`;

  if (params.txHash) {
    message += `[View on BaseScan](https://basescan.org/tx/${params.txHash})\n`;
  }
  message += `[Claim your USDC](${params.claimUrl}?user=${params.telegramUserId})`;

  return telegramPost(params.botToken, 'sendMessage', {
    chat_id: params.chatId,
    text: message,
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
  });
}

export async function sendTreasuryAlert(
  params: SendTreasuryAlertParams
): Promise<{ success: boolean; error?: string }> {
  const message = `⚠️ *Treasury Alert — ${escapeMarkdown(params.communityName)}*\n\n`
    + `Current balance: *${params.currentBalance} USDC*\n`
    + `Tips remaining at current rate: ~${params.tipsRemaining}\n\n`
    + `Please fund the community treasury to continue rewarding contributors.`;

  return telegramPost(params.botToken, 'sendMessage', {
    chat_id: params.adminChatId,
    text: message,
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
  });
}

export async function sendWelcomeMessage(
  params: SendWelcomeMessageParams
): Promise<{ success: boolean; error?: string }> {
  const message = `👋 *Welcome to Valor!*\n\n`
    + `I automatically reward quality contributors in your community with USDC.\n\n`
    + `Here's how it works:\n`
    + `1. Fund your treasury with USDC on Base\n`
    + `2. I evaluate every message using AI\n`
    + `3. Top contributors get tipped automatically\n\n`
    + `Manage your community settings in the Valor dashboard.`;

  return telegramPost(params.botToken, 'sendMessage', {
    chat_id: params.chatId,
    text: message,
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
  });
}

export async function setBotWebhook(
  params: SetBotWebhookParams
): Promise<{ success: boolean; error?: string }> {
  const result = await telegramPost(params.botToken, 'setWebhook', {
    url: params.webhookUrl,
    secret_token: params.secretToken,
  });

  console.error(JSON.stringify({ step: 'setBotWebhook', webhookUrl: params.webhookUrl, success: result.success }));
  return result;
}

export async function deleteBotWebhook(
  params: DeleteBotWebhookParams
): Promise<{ success: boolean; error?: string }> {
  const result = await telegramPost(params.botToken, 'deleteWebhook', {});
  console.error(JSON.stringify({ step: 'deleteBotWebhook', success: result.success }));
  return result;
}
