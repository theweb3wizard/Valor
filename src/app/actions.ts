'use server';

import { evaluateTelegramMessageQuality } from '@/ai/flows/evaluate-telegram-message-quality-flow';
import { supabase, getWalletByUsername, getCommunitySettings } from '@/lib/supabase';

// Simulator uses a fixed community context — same chat_id as the live bot.
// This ensures simulator entries appear correctly in the activity log.
const SIMULATOR_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

export async function processMessage(messageContent: string, username: string = 'simulator_user') {
  try {
    // Load community so we can attach community_id to simulator records
    const community = SIMULATOR_CHAT_ID
      ? await getCommunitySettings(SIMULATOR_CHAT_ID)
      : null;

    const communityId = community?.id ?? null;
    const tipAmount = community?.tip_amount ?? 2;

    const result = await evaluateTelegramMessageQuality({ messageContent });

    // Save to Supabase so simulator messages appear in activity log
    const { error: evalError } = await supabase.from('evaluations').insert({
      community_id: communityId,
      username,
      message_content: messageContent,
      score: result.score,
      reason: result.reason,
      should_tip: result.should_tip,
      timestamp: new Date().toISOString()
    });

    if (evalError) {
      console.error('[Simulator] Failed to log evaluation:', evalError.message);
    }

    if (result.should_tip) {
      // Pass both required arguments to getWalletByUsername
      const walletAddress = communityId
        ? await getWalletByUsername(username, communityId)
        : null;

      const status = walletAddress ? 'queued' : 'pending_registration';

      const { error: tipError } = await supabase.from('tips').insert({
        community_id: communityId,
        username,
        amount: tipAmount,
        transaction_status: status,
        wallet_address: walletAddress || null,
        timestamp: new Date().toISOString()
      });

      if (tipError) {
        console.error('[Simulator] Failed to log tip:', tipError.message);
      }
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('[Simulator] Error processing message:', error);
    return { success: false, error: 'Failed to evaluate message quality.' };
  }
}