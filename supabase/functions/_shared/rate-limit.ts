/** Ventana fija: como mucho `max` solicitudes cada `windowSeconds`. */
export interface RateLimitRule {
  max: number;
  windowSeconds: number;
}

/** waitlist-signup: 5 por IP cada 10 minutos. */
export const IP_RULE: RateLimitRule = { max: 5, windowSeconds: 10 * 60 };
/** waitlist-signup: 3 por email por día. */
export const EMAIL_RULE: RateLimitRule = { max: 3, windowSeconds: 24 * 60 * 60 };

/** Contador atómico; en producción es la función SQL `bump_rate_limit`. */
export type BumpRateLimit = (bucket: string, rule: RateLimitRule, now: Date) => Promise<boolean>;

/**
 * Clave del contador: sha-256 de `sal:tipo:valor` en hex. Ni la IP ni el email quedan en claro en
 * la tabla, y sin la sal no se pueden recalcular.
 */
export async function bucketKey(
  kind: 'ip' | 'email',
  value: string,
  salt: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${kind}:${value}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'));
  return `${kind}:${hex.join('')}`;
}

/**
 * IP del cliente: la primera entrada de `x-forwarded-for` (el gateway de Supabase agrega las
 * suyas al final). Sin header, todas las solicitudes comparten el bucket `unknown`.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first !== undefined && first.length > 0 ? first : 'unknown';
}
