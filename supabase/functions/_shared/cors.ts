export const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:4321'] as const;

const ALLOWED_HEADERS = 'authorization, x-client-info, apikey, content-type';

/** `ALLOWED_ORIGINS` es una lista separada por comas; sin valor, solo la landing local (Astro). */
export function parseAllowedOrigins(value: string | undefined): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return origins.length > 0 ? origins : [...DEFAULT_ALLOWED_ORIGINS];
}

export interface CorsResult {
  /** Headers para agregar a cualquier respuesta de esta solicitud. */
  headers: Headers;
  /** `false` si la solicitud viene de un navegador con un origen que no está en la lista. */
  allowed: boolean;
}

/**
 * CORS por lista blanca. Las solicitudes sin `Origin` (la app, curl, otras funciones) no son de
 * navegador y pasan; las de un origen desconocido se rechazan antes de tocar la base.
 */
export function cors(req: Request, allowedOrigins: readonly string[]): CorsResult {
  const headers = new Headers({ vary: 'Origin' });
  const origin = req.headers.get('origin');
  if (origin === null) return { headers, allowed: true };
  if (!allowedOrigins.includes(origin)) return { headers, allowed: false };
  headers.set('access-control-allow-origin', origin);
  headers.set('access-control-allow-headers', ALLOWED_HEADERS);
  headers.set('access-control-allow-methods', 'POST, OPTIONS');
  headers.set('access-control-max-age', '86400');
  return { headers, allowed: true };
}

/**
 * Resuelve lo común a todas las funciones: preflight (204/403), origen no permitido (403) y
 * método distinto de POST (405). Devuelve `null` si la solicitud sigue al handler.
 */
export function guardRequest(req: Request, corsResult: CorsResult): Response | null {
  if (!corsResult.allowed) return new Response(null, { status: 403, headers: corsResult.headers });
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: corsResult.headers });
  if (req.method !== 'POST') {
    const headers = new Headers(corsResult.headers);
    headers.set('allow', 'POST, OPTIONS');
    return new Response(null, { status: 405, headers });
  }
  return null;
}
