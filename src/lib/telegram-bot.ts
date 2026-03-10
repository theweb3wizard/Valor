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

let bot: TelegramBot | null = null;
let communityContext: {
  id: string;
  tip_amount: number;
  daily_limit: number;
  min_score: number;
} | null = null;

// Substance signal keywords
const SUBSTANCE_KEYWORDS = [
  'how', 'why', 'what', 'explain', 'because', 'therefore', 'recommend', 'suggest', 
  'solution', 'problem', 'issue', 'help', 'guide', 'tutorial', 'steps', 'example', 
  'difference', 'compare', 'better', 'worse', 'contract', 'wallet', 'token', 
  'chain', 'gas', 'DeFi', 'NFT', 'protocol', 'bridge', 'stake', 'yield', 'liquidity'
];

export async function initTelegramBot() {
  if (bot) return bot;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is missing.');
    return null;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log('🤖 Valor Telegram Bot initialized in polling mode.');

  // Load community context on startup
  if (chatId) {
    communityContext = await getCommunitySettings(chatId);
  }

  const settings = {
    id: communityContext?.id || 'default',
    tip_amount: communityContext?.tip_amount || 2,
    daily_limit: communityContext?.daily_limit || 3,
    min_score: communityContext?.min_score || 7
  };

  bot.on('message', async (msg) => {
    // ONLY listen to groups/supergroups
    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') return;

    const username = msg.from?.username || msg.from?.first_name || 'unknown_user';
    const text = msg.text || msg.caption || '';

    // FILTER 1: Hard Rules
    const isBot = msg.from?.is_bot;
    const isCommand = text.startsWith('/');
    const isTooShort = text.length < 20;
    const isMediaOnly = !text && !msg.caption;

    if (isBot || isCommand || isMediaOnly || isTooShort) {
      // Log filtered messages but don't evaluate
      if (!isBot && !isCommand) {
        await logEvaluation(username, text, 0, "Filtered: below quality threshold (Hard Rules)", false, settings.id);
      }
      return;
    }

    // FILTER 2: Substance Signal
    const hasQuestion = text.includes('?');
    const wordCount = text.split(/\s+/).length;
    const hasKeywords = SUBSTANCE_KEYWORDS.some(kw => text.toLowerCase().includes(kw));

    if (!hasQuestion && wordCount <= 8 && !hasKeywords) {
      await logEvaluation(username, text, 0, "Filtered: below quality threshold (Low Substance)", false, settings.id);
      return;
    }

    try {
      const evaluation = await evaluateTelegramMessageQuality({ messageContent: text });
      
      // PERSIST Evaluation
      await logEvaluation(username, text, evaluation.score, evaluation.reason, evaluation.should_tip, settings.id);

      if (evaluation.should_tip) {
        // RATE LIMITING & ELIGIBILITY
        const today = new Date().toISOString().split('T')[0];
        const rateLimit = await getRateLimit(settings.id, username, today);
        const evalCount = await getUserEvaluationCount(username);
        
        // 1. Daily Limit Check
        if (rateLimit && rateLimit.tips_today >= settings.daily_limit) {
          await updateEvaluationReason(username, text, "Rate limited: daily limit reached");
          return;
        }

        // 2. Cooldown Check (30 mins)
        if (rateLimit && rateLimit.last_tip_at) {
          const lastTip = new Date(rateLimit.last_tip_at).getTime();
          const now = Date.now();
          if (now - lastTip < 30 * 60 * 1000) {
            await updateEvaluationReason(username, text, "Rate limited: cooldown active");
            return;
          }
        }

        // 3. New User Penalty
        const requiredScore = evalCount < 5 ? settings.min_score + 1 : settings.min_score;
        if (evaluation.score < requiredScore) {
          await updateEvaluationReason(username, text, `New user penalty: required score ${requiredScore}`);
          return;
        }

        // ALL CHECKS PASS: Fire Tip
        const walletAddress = await getWalletByUsername(username);
        let responseMessage = `⚡ Valor tipped @${username} ${settings.tip_amount} USDT — Score: ${evaluation.score}/10 — ${evaluation.reason}`;
        let status = 'pending_registration';
        
        if (walletAddress) {
          responseMessage += `\n\nDirect transfer to registered wallet will be processed.`;
          status = 'queued';
        } else {
          responseMessage += `\n\n💡 @${username} — Use the /withdraw page on the dashboard to register your wallet address and receive tips.`;
        }
        
        bot?.sendMessage(msg.chat.id, responseMessage);

        // Record Tip & Update Rate Limits
        await supabase.from('tips').insert({
          community_id: settings.id,
          username,
          amount: settings.tip_amount,
          transaction_status: status,
          wallet_address: walletAddress || null,
          timestamp: new Date().toISOString()
        });

        await updateRateLimit(settings.id, username, today);
      }
    } catch (error) {
      console.error('Bot processing error:', error);
    }
  });

  return bot;
}

async function logEvaluation(username: string, content: string, score: number, reason: string, should_tip: boolean, communityId: string) {
  await supabase.from('evaluations').insert({
    community_id: communityId,
    username,
    message_content: content,
    score,
    reason,
    should_tip,
    timestamp: new Date().toISOString()
  });
}

async function updateEvaluationReason(username: string, content: string, newReason: string) {
  // Find the most recent evaluation for this user/content and update the reason
  // This is for logging why a "should_tip" true message was actually not tipped
  const { data } = await supabase
    .from('evaluations')
    .select('id')
    .eq('username', username)
    .eq('message_content', content)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (data) {
    await supabase.from('evaluations').update({ reason: newReason }).eq('id', data.id);
  }
}
