'use server';

import { evaluateTelegramMessageQuality } from '@/ai/flows/evaluate-telegram-message-quality-flow';
import { supabase, getWalletByUsername } from '@/lib/supabase';

export async function processMessage(messageContent: string, username: string = 'simulator_user') {
  try {
    const result = await evaluateTelegramMessageQuality({ messageContent });
    
    // Save to Supabase so simulator messages appear in activity log
    await supabase.from('evaluations').insert({
      username,
      message_content: messageContent,
      score: result.score,
      reason: result.reason,
      should_tip: result.should_tip,
      timestamp: new Date().toISOString()
    });

    if (result.should_tip) {
      // Check for wallet even in simulator to keep status logic consistent
      const walletAddress = await getWalletByUsername(username);
      const status = walletAddress ? 'queued' : 'pending_registration';

      await supabase.from('tips').insert({
        username,
        amount: 2,
        transaction_status: status,
        wallet_address: walletAddress || null,
        timestamp: new Date().toISOString()
      });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error processing message:', error);
    return { success: false, error: 'Failed to evaluate message quality.' };
  }
}
