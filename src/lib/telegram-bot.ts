import TelegramBot from 'node-telegram-bot-api';
import { evaluateTelegramMessageQuality } from '@/ai/flows/evaluate-telegram-message-quality-flow';
import {
  supabase,
  getCommunitySettings,
  getRateLimit,
  updateRateLimit,
  getUserEvaluationCount
} from '@/lib/supabase';
import {
  getOrCreateContributorWallet,
  sendUsdtTip
} from '@/lib/wdk';

// ─── Types ────────────────────────────────────────────────────────────────────

type CommunityContext = {
  id: string;
  tip_amount: number;
  daily_limit: number;
  min_score: number;
};

// ─── Module-level state ───────────────────────────────────────────────────────

let communityContext: CommunityContext | null = null;

// ─── Crypto Keywords ──────────────────────────────────────────────────────────
// Crypto-domain keywords only — generic English words removed intentionally.
// Word count (>8) and question mark checks handle general substance detection.
// These keywords exist solely to catch technical crypto discussions specifically.
const CRYPTO_KEYWORDS = [
  'wallet', 'token', 'blockchain', 'contract', 'protocol',
  'defi', 'nft', 'gas', 'bridge', 'stake', 'yield', 'liquidity',
  'chain', 'transaction', 'address', 'seed', 'exchange',
  'dex', 'cex', 'rugpull', 'whitepaper', 'tokenomics',
  'airdrop', 'mint', 'burn'
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Strips emojis and punctuation, returns lowercase words only.
function extractMeaningfulWords(text: string): string[] {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, ' ')
    .replace(/[\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0);
}

// Loads and caches community context from Supabase.
async function getCommunityContext(): Promise<CommunityContext | null> {
  if (communityContext) return communityContext;

  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.error('[Valor] TELEGRAM_CHAT_ID is not set.');
    return null;
  }

  communityContext = await getCommunitySettings(chatId);

  if (!communityContext) {
    console.error(`[Valor] No community found for chat_id: ${chatId}`);
    return null;
  }

  console.log(
    `[Valor] Community loaded: id="${communityContext.id}" | ` +
    `tip: ${communityContext.tip_amount} USDT | ` +
    `limit: ${communityContext.daily_limit}/day | ` +
    `min score: ${communityContext.min_score}`
  );
  return communityContext;
}

// Returns a bot instance for sending messages only (no polling).
function getBotSender(): TelegramBot {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('[Valor] TELEGRAM_BOT_TOKEN is not set.');
  return new TelegramBot(token, { polling: false });
}

// ─── Webhook Entry Point ──────────────────────────────────────────────────────

export async function processWebhookUpdate(update: TelegramBot.Update): Promise<void> {
  const msg = update.message;
  if (!msg) return;

  // Only process group and supergroup messages
  if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') return;

  const community = await getCommunityContext();
  if (!community) return;

  const username = msg.from?.username
    ? `@${msg.from.username}`
    : (msg.from?.first_name || 'unknown_user');
  const rawText = (msg.text || msg.caption || '').trim();

  // ─── FILTER 1: Hard Rules (zero cost, instant) ─────────────────────────────
  if (msg.from?.is_bot) return;
  if (!rawText) return;
  if (rawText.startsWith('/')) return;

  const meaningfulWords = extractMeaningfulWords(rawText);
  if (meaningfulWords.length < 4) {
    console.log(`[Filter1] BLOCKED ${username} — only ${meaningfulWords.length} meaningful words: "${rawText}"`);
    await logEvaluation(username, rawText, 0, 'Filtered: message too short (fewer than 4 meaningful words)', false, community.id);
    return;
  }

  // ─── FILTER 2: Substance Signal (zero cost, instant) ───────────────────────
  const hasQuestion = rawText.includes('?');
  const wordCount = meaningfulWords.length;
  const lowerText = rawText.toLowerCase();
  const hasCryptoKeyword = CRYPTO_KEYWORDS.some(kw => lowerText.includes(kw));

  if (!hasQuestion && wordCount <= 8 && !hasCryptoKeyword) {
    console.log(`[Filter2] BLOCKED ${username} — no substance signal (words: ${wordCount}, question: ${hasQuestion}, crypto keyword: false)`);
    await logEvaluation(username, rawText, 0, 'Filtered: low substance signal', false, community.id);
    return;
  }

  console.log(`[Filter2] PASSED ${username} — words: ${wordCount}, question: ${hasQuestion}, crypto keyword: ${hasCryptoKeyword}`);

  try {
    // ─── REPLY CONTEXT ────────────────────────────────────────────────────────
    // If this message is a reply, pass the parent message as context to Gemini.
    // Capped at 200 chars to control token cost. Improves evaluation of replies
    // that are valuable in context but appear weak in isolation.
    const replyContext = msg.reply_to_message?.text
      ? `This message is a reply to: "${msg.reply_to_message.text.slice(0, 200)}"\n\n`
      : '';

    const messageForEvaluation = `${replyContext}${rawText}`;

    // ─── AI EVALUATION ────────────────────────────────────────────────────────
    console.log(`[Valor] Sending to Gemini — ${username}: "${rawText.slice(0, 80)}${rawText.length > 80 ? '...' : ''}"`);
    if (replyContext) {
      console.log(`[Valor] Reply context: "${msg.reply_to_message!.text!.slice(0, 60)}..."`);
    }

    const evaluation = await evaluateTelegramMessageQuality({ messageContent: messageForEvaluation });
    console.log(`[Gemini] ${username} — score: ${evaluation.score}/10, should_tip: ${evaluation.should_tip}, reason: "${evaluation.reason}"`);

    await logEvaluation(username, rawText, evaluation.score, evaluation.reason, evaluation.should_tip, community.id);

    if (!evaluation.should_tip) {
      console.log(`[Valor] No tip — should_tip false for ${username} (score: ${evaluation.score})`);
      return;
    }

    // ─── RATE LIMIT CHECKS ────────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    console.log(`[RateLimit] Running checks for ${username} — today: ${today}`);

    const rateLimit = await getRateLimit(community.id, username, today);

    if (rateLimit && rateLimit.tips_today >= community.daily_limit) {
      console.log(`[RateLimit] BLOCKED ${username} — daily limit hit (${rateLimit.tips_today}/${community.daily_limit}).`);
      return;
    }
    console.log(`[RateLimit] Daily limit OK — ${username}: ${rateLimit?.tips_today ?? 0}/${community.daily_limit} tips today`);

    if (rateLimit?.last_tip_at) {
      const minutesSinceLastTip = (Date.now() - new Date(rateLimit.last_tip_at).getTime()) / 60000;
      if (minutesSinceLastTip < 30) {
        console.log(`[RateLimit] BLOCKED ${username} — cooldown active (${Math.round(minutesSinceLastTip)}m since last tip).`);
        return;
      }
      console.log(`[RateLimit] Cooldown OK — ${username}: ${Math.round(minutesSinceLastTip)}m since last tip`);
    } else {
      console.log(`[RateLimit] Cooldown OK — ${username}: no previous tip recorded`);
    }

    const evalCount = await getUserEvaluationCount(username, community.id);
    const requiredScore = evalCount < 5 ? community.min_score + 1 : community.min_score;
    console.log(`[RateLimit] New user check — ${username}: ${evalCount} evals, required score: ${requiredScore}`);

    if (evaluation.score < requiredScore) {
      console.log(`[RateLimit] BLOCKED ${username} — score ${evaluation.score} < required ${requiredScore}.`);
      return;
    }
    console.log(`[RateLimit] Score check OK — ${username}: score ${evaluation.score} >= required ${requiredScore}`);

    // ─── ALL CHECKS PASSED — FIRE TIP ─────────────────────────────────────────
    console.log(`[Valor] ⚡ ALL CHECKS PASSED — firing tip for ${username} (score: ${evaluation.score})`);

    // ─── WDK: GET OR CREATE CONTRIBUTOR WALLET ────────────────────────────────
    let walletAddress: string | null = null;
    let txHash: string | null = null;
    let transactionStatus = 'pending_registration';
    let tipMessage = '';

    try {
      const { address, isNew } = await getOrCreateContributorWallet(username, community.id);
      walletAddress = address;

      if (isNew) {
        console.log(`[WDK] ✨ New wallet created for ${username}: ${address}`);
      } else {
        console.log(`[WDK] Existing wallet for ${username}: ${address}`);
      }

      // ─── WDK: SEND USDT TIP ───────────────────────────────────────────────
      console.log(`[WDK] Sending ${community.tip_amount} USDt → ${username} at ${address}`);
      const result = await sendUsdtTip(address, community.tip_amount);
      txHash = result.txHash;
      transactionStatus = 'confirmed';

      console.log(`[WDK] ✅ Tip confirmed on-chain — tx: ${txHash}`);

      tipMessage =
        `⚡ *Valor tipped ${username} ${community.tip_amount} USDT*\n` +
        `Score: ${evaluation.score}/10 — ${evaluation.reason}\n\n` +
        `✅ Sent on-chain!\n` +
        `🔗 [View on Etherscan](https://sepolia.etherscan.io/tx/${txHash})\n\n` +
        `💡 Visit the Valor dashboard to withdraw your tips.`;

    } catch (wdkError: unknown) {
      // WDK failed — fallback: record tip as failed, notify group.
      // The tip intent is preserved in the database for retry.
      const errorMessage = wdkError instanceof Error ? wdkError.message : 'Unknown WDK error';
      console.error(`[WDK] Transfer failed for ${username}: ${errorMessage}`);
      transactionStatus = walletAddress ? 'transfer_failed' : 'pending_registration';

      tipMessage =
        `⚡ *Valor recognized ${username} for a quality contribution!*\n` +
        `Score: ${evaluation.score}/10 — ${evaluation.reason}\n\n` +
        `💡 ${community.tip_amount} USDT tip queued. Visit the Valor dashboard to claim.`;
    }

    // ─── SEND TELEGRAM NOTIFICATION ───────────────────────────────────────────
    const bot = getBotSender();
    await bot.sendMessage(msg.chat.id, tipMessage, { parse_mode: 'Markdown' });
    console.log(`[Valor] Tip notification sent to chat ${msg.chat.id}`);

    // ─── RECORD TIP IN DATABASE ───────────────────────────────────────────────
    const { error: tipError } = await supabase.from('tips').insert({
      community_id: community.id,
      username,
      amount: community.tip_amount,
      transaction_status: transactionStatus,
      wallet_address: walletAddress || null,
      tx_hash: txHash || null,
      timestamp: new Date().toISOString()
    });

    if (tipError) {
      console.error('[Supabase] Failed to record tip:', tipError.message, '| code:', tipError.code);
    } else {
      console.log(`[Supabase] Tip recorded — status: ${transactionStatus} | tx: ${txHash || 'none'}`);
    }

    // ─── UPDATE RATE LIMITS ───────────────────────────────────────────────────
    const rateLimitUpdated = await updateRateLimit(community.id, username, today);
    if (!rateLimitUpdated) {
      console.error(`[Valor] WARNING: Tip fired for ${username} but rate limit was NOT updated.`);
    }

  } catch (error) {
    console.error('[Valor] Unhandled error during message processing:', error);
  }
}

// ─── Evaluation Logger ────────────────────────────────────────────────────────

async function logEvaluation(
  username: string,
  content: string,
  score: number,
  reason: string,
  should_tip: boolean,
  communityId: string
) {
  const { error } = await supabase.from('evaluations').insert({
    community_id: communityId,
    username,
    message_content: content,
    score,
    reason,
    should_tip,
    timestamp: new Date().toISOString()
  });

  if (error) {
    console.error('[Supabase] Failed to log evaluation:', error.message, '| code:', error.code);
  }
}

// ─── Legacy export (kept for compatibility with instrumentation.ts) ───────────
export async function initTelegramBot() {
  console.log('[Valor] initTelegramBot called — webhook mode active, no polling started.');
  return null;
}