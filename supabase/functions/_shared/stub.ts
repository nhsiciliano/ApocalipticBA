import type { z } from 'zod';

import { cors, guardRequest } from './cors.ts';
import { json, readJson } from './json.ts';

export interface StubDeps {
  allowedOrigins: readonly string[];
}

/** Issue de Zod reducido a lo que el cliente necesita para corregir el request. */
export interface RequestIssue {
  path: (string | number)[];
  code: string;
  message: string;
}

export function toIssues(error: z.ZodError): RequestIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map((segment) => (typeof segment === 'symbol' ? String(segment) : segment)),
    code: issue.code,
    message: issue.message,
  }));
}

/**
 * Función stub de Fase 0: valida el request con el esquema de `shared` y responde 501 si es
 * válido (el contrato ya está fijado) o 400 con los issues si no.
 */
export function createStubHandler(schema: z.ZodType) {
  return async (req: Request, deps: StubDeps): Promise<Response> => {
    const corsResult = cors(req, deps.allowedOrigins);
    const early = guardRequest(req, corsResult);
    if (early !== null) return early;

    const body = await readJson(req);
    if (body === undefined) {
      return json({ error: 'invalid_json' }, 400, corsResult.headers);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return json(
        { error: 'invalid_request', issues: toIssues(parsed.error) },
        400,
        corsResult.headers,
      );
    }
    return json({ error: 'not_implemented', hito: 'Fase 2' }, 501, corsResult.headers);
  };
}
