import {
  isHoneypotTripped,
  WaitlistSignupSchema,
  type WaitlistSignup,
  type WaitlistSignupResponse,
} from '@apocalipticba/shared';

import { cors, guardRequest } from '../_shared/cors.ts';
import { json, readJson } from '../_shared/json.ts';
import {
  bucketKey,
  clientIp,
  EMAIL_RULE,
  IP_RULE,
  type BumpRateLimit,
} from '../_shared/rate-limit.ts';

/** Acceso a la base que necesita la función; en runtime lo implementa `createWaitlistStore`. */
export interface WaitlistStore {
  bumpRateLimit: BumpRateLimit;
  /** Inserta la fila; `duplicate` si el email ya estaba (unique sobre citext). */
  insert(entry: Omit<WaitlistSignup, 'website'>): Promise<'inserted' | 'duplicate'>;
}

export interface WaitlistDeps {
  store: WaitlistStore;
  now: () => Date;
  /** Sal de los buckets de rate limit (`RATE_LIMIT_SALT`). */
  salt: string;
  allowedOrigins: readonly string[];
  /** Log de errores internos; nunca llegan al cliente. */
  logError?: (message: string, error: unknown) => void;
}

/**
 * POST de la landing. Orden: CORS → JSON → rate limit por IP → validación → honeypot → rate limit
 * por email → insert. El honeypot y los duplicados responden `{ ok: true }` igual que un alta real,
 * para no avisarle al bot ni permitir enumerar emails.
 */
export async function handleWaitlistSignup(req: Request, deps: WaitlistDeps): Promise<Response> {
  const corsResult = cors(req, deps.allowedOrigins);
  const early = guardRequest(req, corsResult);
  if (early !== null) return early;

  const respond = (body: WaitlistSignupResponse, status: number): Response =>
    json(body, status, corsResult.headers);

  try {
    const body = await readJson(req);
    const now = deps.now();

    const ipBucket = await bucketKey('ip', clientIp(req), deps.salt);
    if (!(await deps.store.bumpRateLimit(ipBucket, IP_RULE, now))) {
      return respond({ ok: false, error: 'rate_limited' }, 429);
    }

    const parsed = WaitlistSignupSchema.safeParse(body);
    if (!parsed.success) return respond({ ok: false, error: 'invalid_email' }, 400);
    if (isHoneypotTripped(parsed.data)) return respond({ ok: true }, 200);

    const { email, locale, source } = parsed.data;
    const emailBucket = await bucketKey('email', email, deps.salt);
    if (!(await deps.store.bumpRateLimit(emailBucket, EMAIL_RULE, now))) {
      return respond({ ok: false, error: 'rate_limited' }, 429);
    }

    await deps.store.insert(source === undefined ? { email, locale } : { email, locale, source });
    return respond({ ok: true }, 200);
  } catch (error) {
    deps.logError?.('waitlist-signup failed', error);
    return respond({ ok: false, error: 'internal' }, 500);
  }
}
