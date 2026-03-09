'use server';
/**
 * @fileOverview A Genkit flow for evaluating the quality of Telegram messages.
 *
 * - evaluateTelegramMessageQuality - A function that evaluates the quality of a Telegram message.
 * - EvaluateTelegramMessageQualityInput - The input type for the evaluateTelegramMessageQuality function.
 * - EvaluateTelegramMessageQualityOutput - The return type for the evaluateTelegramMessageQuality function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvaluateTelegramMessageQualityInputSchema = z.object({
  messageContent: z.string().describe('The content of the Telegram message to be evaluated.'),
});
export type EvaluateTelegramMessageQualityInput = z.infer<typeof EvaluateTelegramMessageQualityInputSchema>;

const EvaluateTelegramMessageQualityOutputSchema = z.object({
  score: z.number().int().min(0).max(10).describe('A quality score for the message, from 0 to 10.'),
  reason: z.string().describe('A one-sentence reason explaining the assigned score.'),
  should_tip: z.boolean().describe('True if the message quality score is 7 or above, indicating it should receive a tip.'),
});
export type EvaluateTelegramMessageQualityOutput = z.infer<typeof EvaluateTelegramMessageQualityOutputSchema>;

export async function evaluateTelegramMessageQuality(
  input: EvaluateTelegramMessageQualityInput
): Promise<EvaluateTelegramMessageQualityOutput> {
  return evaluateTelegramMessageQualityFlow(input);
}

const evaluateMessageQualityPrompt = ai.definePrompt({
  name: 'evaluateMessageQualityPrompt',
  input: {schema: EvaluateTelegramMessageQualityInputSchema},
  output: {schema: EvaluateTelegramMessageQualityOutputSchema},
  prompt: `You are an autonomous AI agent designed to evaluate the quality of Telegram messages.

Your task is to analyze the provided message content and assign a quality score from 0 to 10 based on the following criteria:

Reward highly if:
- The message clearly answers a question.
- It adds genuine, specific, and valuable information to the conversation.
- It helps another community member solve a problem.

Penalize heavily if:
- The message is spam or self-promotion.
- It consists of one-word replies or greetings with no substance.
- It provides irrelevant or unhelpful information.

Based on your evaluation, provide a single, concise sentence for the 'reason' explaining the score. Finally, set 'should_tip' to true if the score is 7 or above.

Telegram Message to evaluate: """{{{messageContent}}}"""
`,
});

const evaluateTelegramMessageQualityFlow = ai.defineFlow(
  {
    name: 'evaluateTelegramMessageQualityFlow',
    inputSchema: EvaluateTelegramMessageQualityInputSchema,
    outputSchema: EvaluateTelegramMessageQualityOutputSchema,
  },
  async (input) => {
    const {output} = await evaluateMessageQualityPrompt(input);
    if (!output) {
      throw new Error('Failed to evaluate message quality: No output from prompt.');
    }
    return output;
  }
);
