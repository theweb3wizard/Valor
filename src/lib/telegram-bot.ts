import TelegramBot from 'node-telegram-bot-api';
import { evaluateTelegramMessageQuality } from '@/ai/flows/evaluate-telegram-message-quality-flow';
import { supabase, getWalletByUsername, registerWallet } from '@/lib/supabase';

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

  // 1. Private Message Handler: Wallet Registration
  // Specifically listens for /register command in private chats
  bot.onText(/\/register (.+)/, async (msg, match) => {
    // Bug 1 Fix: Ensure /register only works in private chats
    if (msg.chat.type !== 'private') return;
    
    const username = msg.from?.username || msg.from?.first_name || 'unknown_user';
    const address = match?.[1]?.trim();

    // Validate Ethereum address format
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!address || !ethAddressRegex.test(address)) {
      bot?.sendMessage(msg.chat.id, "❌ Invalid wallet address. Please provide a valid Ethereum address starting with 0x (42 characters long).");
      return;
    }

    try {
      await registerWallet(username, address);
      bot?.sendMessage(msg.chat.id, "✅ Wallet registered successfully. You will now receive USDT tips directly to your wallet when Valor rewards your contributions.");
    } catch (error) {
      console.error('Error registering wallet:', error);
      bot?.sendMessage(msg.chat.id, "❌ An error occurred while saving your wallet. Please try again later.");
    }
  });

  // 2. Group Message Handler: Quality Evaluation
  bot.on('message', async (msg) => {
    // Filter logic to prevent bugs
    // - Skip bot messages
    // - Skip messages without text
    // - Bug Fix: Skip messages starting with / (commands)
    if (msg.from?.is_bot || !msg.text || msg.text.startsWith('/')) return;
    
    // Bug 1 Fix: Skip private messages entirely in this group evaluator
    if (msg.chat.type === 'private') return;

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
        // Check for registered wallet
        const walletAddress = await getWalletByUsername(username);
        let responseMessage = `⚡ Valor tipped @${username} 2 USDT — Score: ${evaluation.score}/10 — ${evaluation.reason}`;
        let status = 'pending_registration';
        
        if (walletAddress) {
          responseMessage += `\n\nDirect transfer to registered wallet will be processed.`;
          status = 'queued';
        } else {
          // Provide instructions for future registration
          responseMessage += `\n\n💡 @${username} — send /register [your-wallet-address] to @${process.env.VALOR_BOT_USERNAME || 'ValorAgentBot'} in private chat to receive future tips directly to your wallet.`;
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
