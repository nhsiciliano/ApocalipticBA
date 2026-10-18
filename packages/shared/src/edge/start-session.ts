import { z } from 'zod';

import { ID_PATTERNS } from '../scenario/ids';

/** Semver 2.0.0 (https://semver.org), con prerelease y build opcionales. */
export const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export const PLATFORMS = ['ios', 'android'] as const;

export const StartSessionRequestSchema = z.strictObject({
  scenarioSlug: z.string().regex(ID_PATTERNS.scenarioSlug),
  appVersion: z.string().regex(SEMVER_PATTERN),
  platform: z.enum(PLATFORMS),
});
export type StartSessionRequest = z.infer<typeof StartSessionRequestSchema>;

export const StartSessionResponseSchema = z.strictObject({
  sessionId: z.uuid(),
  /** Token firmado que `submit-score` valida al cerrar la partida. */
  token: z.string().min(1),
  expiresAt: z.iso.datetime({ offset: true }),
});
export type StartSessionResponse = z.infer<typeof StartSessionResponseSchema>;
