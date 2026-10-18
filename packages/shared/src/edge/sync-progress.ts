import { z } from 'zod';

import { ID_PATTERNS, NoteIdSchema } from '../scenario/ids';

export const ProgressEntrySchema = z.strictObject({
  scenarioSlug: z.string().regex(ID_PATTERNS.scenarioSlug),
  bestTimeMs: z.int().positive().optional(),
  completed: z.boolean(),
  notesFound: z.array(NoteIdSchema),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type ProgressEntry = z.infer<typeof ProgressEntrySchema>;

/**
 * Regla de merge entre el progreso local y el de la nube, por `scenarioSlug`:
 * - `completed`: gana `true`.
 * - `bestTimeMs`: gana el menor (si solo uno lo tiene, ese).
 * - `notesFound`: unión de ambos.
 * - `updatedAt`: gana el más reciente.
 * `conflicts` cuenta los escenarios donde local y nube diferían.
 */
export const SyncProgressRequestSchema = z.strictObject({
  progress: z.array(ProgressEntrySchema).max(100),
});
export type SyncProgressRequest = z.infer<typeof SyncProgressRequestSchema>;

export const SyncProgressResponseSchema = z.strictObject({
  merged: z.array(ProgressEntrySchema),
  conflicts: z.int().min(0),
});
export type SyncProgressResponse = z.infer<typeof SyncProgressResponseSchema>;
