
'use server';

import { evaluateTelegramMessageQuality } from '@/ai/flows/evaluate-telegram-message-quality-flow';
import { supabase } from '@/lib/supabase';

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
      await supabase.from('tips').insert({
        username,
        amount: 2,
        transaction_status: 'pending',
        timestamp: new Date().toISOString()
      });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error processing message:', error);
    return { success: false, error: 'Failed to evaluate message quality.' };
  }
}
