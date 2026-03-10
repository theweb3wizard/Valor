import TelegramBot from 'node-telegram-bot-api';
import { evaluateTelegramMessageQuality } from '@/ai/flows/evaluate-telegram-message-quality-flow';
import { supabase, getWalletByUsername } from '@/lib/supabase';

let bot: TelegramBot | null = null;

export function initTelegramBot() {
  if (bot) return bot;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is missing in environment variables.');
    return null;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log('🤖 Valor Telegram Bot initialized in polling mode.');

  // Group Message Handler: Quality Evaluation
  // Valor exclusively monitors group conversations. Private messages are ignored.
  bot.on('message', async (msg) => {
    // 1. Filter: Skip private messages entirely
    if (msg.chat.type === 'private') return;

    // 2. Filter: Skip bot messages, non-text messages, and commands
    if (msg.from?.is_bot || !msg.text || msg.text.startsWith('/')) return;
    
    const username = msg.from?.username || msg.from?.first_name || 'unknown_user';
    const messageContent = msg.text;

    try {
      const evaluation = await evaluateTelegramMessageQuality({ messageContent });

      // Save evaluation to Supabase
      await supabase.from('evaluations').insert({
        username,
        message_content: messageContent,
        score: evaluation.score,
        reason: evaluation.reason,
        should_tip: evaluation.should_tip,
        timestamp: new Date().toISOString()
      });

      if (evaluation.should_tip) {
        // Check for registered wallet (registered via dashboard)
        const walletAddress = await getWalletByUsername(username);
        let responseMessage = `⚡ Valor tipped @${username} 2 USDT — Score: ${evaluation.score}/10 — ${evaluation.reason}`;
        let status = 'pending_registration';
        
        if (walletAddress) {
          responseMessage += `\n\nDirect transfer to registered wallet will be processed.`;
          status = 'queued';
        }
        
        bot?.sendMessage(msg.chat.id, responseMessage);

        // Log the tip in Supabase
        await supabase.from('tips').insert({
          username,
          amount: 2,
          transaction_status: status,
          wallet_address: walletAddress || null,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Telegram bot evaluation error:', error);
      // Graceful error handling: don't crash the bot
    }
  });

  bot.on('polling_error', (error) => {
    console.error('Telegram Polling Error:', error);
  });

  return bot;
}
