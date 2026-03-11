import TelegramBot from 'node-telegram-bot-api';
import { evaluateTelegramMessageQuality } from '@/ai/flows/evaluate-telegram-message-quality-flow';
import {
  supabase,
  getWalletByUsername,
  getCommunitySettings,
  getRateLimit,
  updateRateLimit,
  getUserEvaluationCount
} from '@/lib/supabase';

// Webhook mode — no persistent bot instance needed.
// A single TelegramBot instance is created without polling, used only
// for sending messages (sendMessage). All incoming updates arrive via
// the POST /api/telegram webhook route, not via polling.
let bot: TelegramBot | null = null;

export type CommunityContext = {
  id: string;
  tip_amount: number;
  daily_limit: number;
  min_score: number;
};

// Community context is loaded once per cold start and reused across
// webhook invocations within the same Vercel function instance.
let communityContext: CommunityContext | null = null;

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

// Strips emojis and punctuation, returns lowercase words only.
// Used for Filter 1 word count — more reliable than character count
// across all languages and emoji combinations.
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

// Returns a bot instance capable of sending messages.
// Does NOT start polling — webhook mode only.
function getBotSender(): TelegramBot {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN!;
    bot = new TelegramBot(token, { polling: false });
    console.log('[Valor] TelegramBot sender instance created (webhook mode, no polling).');
  }
  return bot;
}

// Loads community context from Supabase.
// Cached after first call for the lifetime of the function instance.
async function getCommunityContext(): Promise<CommunityContext | null> {
  if (communityContext) return communityContext;

  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.error('[Valor] TELEGRAM_CHAT_ID is missing. Cannot load community context.');
    return null;
  }

  console.log(`[Valor] Loading community settings for chat_id: ${chatId}`);
  communityContext = await getCommunitySettings(chatId);

  if (!communityContext) {
    console.error(
      `[Valor] No community found in database for chat_id: ${chatId}. ` +
      `Please insert a row into the communities table.`
    );
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

// Main entry point called by the webhook route for every incoming Telegram update.
// This replaces the bot.on('message') handler from polling mode.
export async function processWebhookUpdate(update: TelegramBot.Update): Promise<void> {
  const msg = update.message;

  // Only process actual messages — ignore edits, channel posts, etc.
  if (!msg) {
    console.log('[Valor] Update has no message field — ignoring.');
    return;
  }

  // Only process group and supergroup messages
  if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
    console.log(`[Valor] Ignoring non-group message from chat type: ${msg.chat.type}`);
    return;
  }

  const username = msg.from?.username || msg.from?.first_name || 'unknown_user';
  const rawText = (msg.text || msg.caption || '').trim();

  const community = await getCommunityContext();
  if (!community) {
    console.error('[Valor] Cannot process message — community context unavailable.');
    return;
  }

  // ─── FILTER 1: Hard Rules (zero cost, instant) ───────────────────────────
  if (msg.from?.is_bot) return;
  if (!rawText) return;
  if (rawText.startsWith('/')) return;

  const meaningfulWords = extractMeaningfulWords(rawText);
  if (meaningfulWords.length < 4) {
    console.log(`[Filter1] BLOCKED @${username} — only ${meaningfulWords.length} meaningful words: "${rawText}"`);
    await logEvaluation(username, rawText, 0, 'Filtered: message too short (fewer than 4 meaningful words)', false, community.id);
    return;
  }

  // ─── FILTER 2: Substance Signal (zero cost, instant) ─────────────────────
  const hasQuestion = rawText.includes('?');
  const wordCount = meaningfulWords.length;
  const lowerText = rawText.toLowerCase();
  const hasCryptoKeyword = CRYPTO_KEYWORDS.some(kw => lowerText.includes(kw));

  if (!hasQuestion && wordCount <= 8 && !hasCryptoKeyword) {
    console.log(`[Filter2] BLOCKED @${username} — no substance signal (words: ${wordCount}, question: ${hasQuestion}, crypto keyword: false): "${rawText}"`);
    await logEvaluation(username, rawText, 0, 'Filtered: low substance signal', false, community.id);
    return;
  }

  console.log(`[Filter2] PASSED @${username} — words: ${wordCount}, question: ${hasQuestion}, crypto keyword: ${hasCryptoKeyword}`);

  try {
    // ─── AI EVALUATION ───────────────────────────────────────────────────
    console.log(`[Valor] Sending to Gemini — @${username}: "${rawText.slice(0, 80)}${rawText.length > 80 ? '...' : ''}"`);
    const evaluation = await evaluateTelegramMessageQuality({ messageContent: rawText });
    console.log(`[Gemini] @${username} — score: ${evaluation.score}/10, should_tip: ${evaluation.should_tip}, reason: "${evaluation.reason}"`);

    await logEvaluation(
      username, rawText,
      evaluation.score,
      evaluation.reason,
      evaluation.should_tip,
      community.id
    );

    if (!evaluation.should_tip) {
      console.log(`[Valor] No tip — should_tip is false for @${username} (score: ${evaluation.score})`);
      return;
    }

    // ─── RATE LIMIT CHECKS ───────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    console.log(`[RateLimit] Running rate limit checks for @${username} — today: ${today}`);

    const rateLimit = await getRateLimit(community.id, username, today);

    // Check 1: Daily limit
    if (rateLimit && rateLimit.tips_today >= community.daily_limit) {
      console.log(`[RateLimit] BLOCKED @${username} — hit daily limit (${rateLimit.tips_today}/${community.daily_limit}). No tip.`);
      return;
    }
    console.log(`[RateLimit] Daily limit OK — @${username}: ${rateLimit?.tips_today ?? 0}/${community.daily_limit} tips today`);

    // Check 2: 30-minute cooldown
    if (rateLimit?.last_tip_at) {
      const minutesSinceLastTip = (Date.now() - new Date(rateLimit.last_tip_at).getTime()) / 60000;
      if (minutesSinceLastTip < 30) {
        console.log(`[RateLimit] BLOCKED @${username} — cooldown active (${Math.round(minutesSinceLastTip)}m since last tip, need 30m). No tip.`);
        return;
      }
      console.log(`[RateLimit] Cooldown OK — @${username}: ${Math.round(minutesSinceLastTip)}m since last tip`);
    } else {
      console.log(`[RateLimit] Cooldown OK — @${username}: no previous tip recorded`);
    }

    // Check 3: New user penalty
    const evalCount = await getUserEvaluationCount(username, community.id);
    const requiredScore = evalCount < 5 ? community.min_score + 1 : community.min_score;
    console.log(`[RateLimit] New user check — @${username}: ${evalCount} evaluations, required score: ${requiredScore} (min: ${community.min_score})`);

    if (evaluation.score < requiredScore) {
      console.log(`[RateLimit] BLOCKED @${username} — score ${evaluation.score} < required ${requiredScore} (new user penalty). No tip.`);
      return;
    }
    console.log(`[RateLimit] Score check OK — @${username}: score ${evaluation.score} >= required ${requiredScore}`);

    // ─── ALL CHECKS PASSED — FIRE TIP ────────────────────────────────────
    console.log(`[Valor] ⚡ ALL CHECKS PASSED — firing tip for @${username} (score: ${evaluation.score})`);

    const walletAddress = await getWalletByUsername(username, community.id);

    let tipMessage =
      `⚡ Valor tipped @${username} ${community.tip_amount} USDT\n` +
      `Score: ${evaluation.score}/10 — ${evaluation.reason}`;

    if (walletAddress) {
      tipMessage += `\n\n✅ Transfer queued to registered wallet.`;
      console.log(`[Valor] Wallet found for @${username}: ${walletAddress}`);
    } else {
      tipMessage += `\n\n💡 @${username} — visit the Valor dashboard to register your wallet and receive your tips.`;
      console.log(`[Valor] No wallet registered for @${username} — tip recorded as pending_registration`);
    }

    const sender = getBotSender();
    await sender.sendMessage(msg.chat.id, tipMessage);
    console.log(`[Valor] Tip notification sent to chat ${msg.chat.id}`);

    const { error: tipError } = await supabase.from('tips').insert({
      community_id: community.id,
      username,
      amount: community.tip_amount,
      transaction_status: walletAddress ? 'queued' : 'pending_registration',
      wallet_address: walletAddress || null,
      timestamp: new Date().toISOString()
    });

    if (tipError) {
      console.error('[Supabase] Failed to record tip in tips table:', tipError.message, '| code:', tipError.code);
    } else {
      console.log(`[Supabase] Tip recorded in tips table for @${username}`);
    }

    const rateLimitUpdated = await updateRateLimit(community.id, username, today);
    if (!rateLimitUpdated) {
      console.error(`[Valor] WARNING: Tip fired for @${username} but rate limit was NOT updated. Check Supabase logs.`);
    }

  } catch (error) {
    console.error('[Valor] Unhandled error during message processing:', error);
  }
}

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
    console.error('[Supabase] Failed to log evaluation to evaluations table:', error.message, '| code:', error.code);
  }
}