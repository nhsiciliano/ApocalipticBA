/** Respuesta JSON con status y headers extra (CORS). */
export function json<T>(body: T, status: number, headers?: Headers): Response {
  const merged = new Headers(headers);
  merged.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers: merged });
}

/** Lee el body como JSON; `undefined` si no es JSON válido. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return (await req.json()) as unknown;
  } catch {
    return undefined;
  }
}
