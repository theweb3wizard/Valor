'use server';

import { evaluateTelegramMessageQuality, type EvaluateTelegramMessageQualityOutput } from '@/ai/flows/evaluate-telegram-message-quality-flow';

export async function processMessage(messageContent: string) {
  try {
    const result = await evaluateTelegramMessageQuality({ messageContent });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error processing message:', error);
    return { success: false, error: 'Failed to evaluate message quality.' };
  }
}