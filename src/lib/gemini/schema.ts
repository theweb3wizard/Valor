import { z } from 'zod';

export const evaluationOutputSchema = z.object({
  score: z.number().int().min(0).max(10),
  reason: z.string().max(200),
  should_tip: z.boolean(),
});

export type EvaluationOutput = z.infer<typeof evaluationOutputSchema>;
