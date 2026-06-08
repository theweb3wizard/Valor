import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { zodSchema } from '@ai-sdk/provider-utils';
import { evaluationOutputSchema, type EvaluationOutput } from '@/lib/gemini/schema';

export interface EvaluateMessageParams {
  messageText: string;
  parentMessageText?: string;
  evalContext: string;
  minScore: number;
}

function isRateLimitError(err: unknown): boolean {
  const message = err instanceof Error ? err.message.toLowerCase() : '';
  return message.includes('429') || message.includes('rate limit') || message.includes('too many requests');
}

export async function evaluateMessage(
  params: EvaluateMessageParams
): Promise<EvaluationOutput> {
  const systemPrompt = buildSystemPrompt(params.evalContext, params.minScore);
  const userPrompt = buildUserPrompt(params.messageText, params.parentMessageText);

  const maxRetries = 2;
  const retryDelay = 2000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { object } = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: zodSchema(evaluationOutputSchema),
        system: systemPrompt,
        prompt: userPrompt,
      });

      return object;
    } catch (err) {
      if (attempt < maxRetries && isRateLimitError(err)) {
        console.error(
          JSON.stringify({
            step: 'gemini_evaluation',
            attempt: attempt + 1,
            error: 'Rate limited, retrying...',
          })
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      console.error(
        JSON.stringify({
          step: 'gemini_evaluation',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      );
      return { score: 0, reason: 'Evaluation unavailable', should_tip: false };
    }
  }

  return { score: 0, reason: 'Evaluation unavailable', should_tip: false };
}

function buildSystemPrompt(evalContext: string, minScore: number): string {
  const contextSection = evalContext
    ? `\nCommunity context: ${evalContext}`
    : '';

  return `You are a community quality evaluator for Web3 communities. \
Your job is to score Telegram messages based on their value to the community.

Scoring rubric:
- 1-3: Spam, noise, low-effort content
- 4-6: Basic engagement, on-topic but not substantial
- 7-8: Clear, accurate, helpful technical answer or valuable insight
- 9-10: Detailed, expert-level explanation that significantly advances the discussion

Set should_tip to true ONLY if the score is >= ${minScore}.${contextSection}

Reward: accurate technical answers, problem-solving, detailed explanations, genuine insight.
Penalize: one-word replies, GM/GN spam, self-promotion, copied content, empty hype.

Respond with a score (integer 0-10), a one-sentence reason (max 200 chars), and whether to tip.`;
}

function buildUserPrompt(messageText: string, parentMessageText?: string): string {
  let prompt = `Message to evaluate:\n${messageText}`;
  if (parentMessageText) {
    prompt = `Context (message being replied to):\n${parentMessageText}\n\n${prompt}`;
  }
  return prompt;
}
