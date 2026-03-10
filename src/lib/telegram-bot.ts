
import TelegramBot from 'node-telegram-bot-api';
import { evaluateTelegramMessageQuality } from '@/ai/flows/evaluate-telegram-message-quality-flow';
import { supabase } from '@/lib/supabase';

let bot: TelegramBot | null = null;

export function initTelegramBot() {
  if (bot) return bot;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is missing in environment variables.');
    return null;
  }

  // Use polling mode as requested
  bot = new TelegramBot(token, { polling: true });
  console.log('🤖 Telegram Bot initialized in polling mode.');

  bot.on('message', async (msg) => {
    // Skip messages from bots or messages with no text
    if (msg.from?.is_bot || !msg.text) return;

    const username = msg.from?.username || msg.from?.first_name || 'unknown_user';
    const messageContent = msg.text;

    try {
      // 1. Evaluate message quality using Genkit
      const evaluation = await evaluateTelegramMessageQuality({ messageContent });

      // 2. Save evaluation to Supabase
      const { error: evalError } = await supabase
        .from('evaluations')
        .insert({
          username,
          message_content: messageContent,
          score: evaluation.score,
          reason: evaluation.reason,
          should_tip: evaluation.should_tip,
          timestamp: new Date().toISOString()
        });

      if (evalError) console.error('Error saving evaluation to Supabase:', evalError);

      // 3. If high quality, tip and notify group
      if (evaluation.should_tip) {
        const responseMessage = `⚡ Valor tipped @${username} 2 USDT — Score: ${evaluation.score}/10 — ${evaluation.reason}`;
        
        bot?.sendMessage(msg.chat.id, responseMessage);

        // 4. Save tip to Supabase tips table
        const { error: tipError } = await supabase
          .from('tips')
          .insert({
            username,
            amount: 2,
            transaction_status: 'pending',
            timestamp: new Date().toISOString()
          });

        if (tipError) console.error('Error saving tip to Supabase:', tipError);
      }
    } catch (error) {
      console.error('Telegram bot evaluation error:', error);
    }
  });

  bot.on('polling_error', (error) => {
    console.error('Telegram Polling Error:', error);
  });

  return bot;
}
