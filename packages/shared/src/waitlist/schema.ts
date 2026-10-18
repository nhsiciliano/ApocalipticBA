import { z } from 'zod';

export const LOCALES = ['es-AR', 'en'] as const;
export const LocaleSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof LocaleSchema>;

export const WaitlistSignupSchema = z.strictObject({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  locale: LocaleSchema,
  source: z.string().max(64).optional(),
  /**
   * Honeypot: campo oculto en el formulario que una persona deja vacío. El schema lo acepta con
   * contenido para no avisarle al bot; el que decide es `isHoneypotTripped`.
   */
  website: z.string().max(2048).optional(),
});
export type WaitlistSignup = z.infer<typeof WaitlistSignupSchema>;

/** `true` si el campo honeypot trae contenido: la solicitud es de un bot y se descarta. */
export function isHoneypotTripped(input: { website?: string | undefined }): boolean {
  return (input.website ?? '').trim().length > 0;
}

export const WAITLIST_ERRORS = ['invalid_email', 'rate_limited', 'duplicate', 'internal'] as const;

export const WaitlistSignupResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({ ok: z.literal(true) }),
  z.strictObject({ ok: z.literal(false), error: z.enum(WAITLIST_ERRORS) }),
]);
export type WaitlistSignupResponse = z.infer<typeof WaitlistSignupResponseSchema>;
