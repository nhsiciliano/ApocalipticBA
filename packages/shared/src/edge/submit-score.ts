import { z } from 'zod';

export const SubmitScoreRequestSchema = z.strictObject({
  sessionId: z.uuid(),
  token: z.string().min(1),
  score: z.int().min(0),
  durationMs: z.int().positive(),
  kills: z.int().min(0),
  accuracy: z.number().min(0).max(1),
  headshots: z.int().min(0),
  notesFound: z.array(z.string().min(1).max(64)).max(64),
});
export type SubmitScoreRequest = z.infer<typeof SubmitScoreRequestSchema>;

export const SUBMIT_SCORE_REJECTIONS = [
  'invalid_token',
  'implausible',
  'duplicate',
  'rate_limited',
] as const;

export const SubmitScoreResponseSchema = z.strictObject({
  accepted: z.boolean(),
  rank: z.int().min(1).optional(),
  reason: z.enum(SUBMIT_SCORE_REJECTIONS).optional(),
});
export type SubmitScoreResponse = z.infer<typeof SubmitScoreResponseSchema>;
