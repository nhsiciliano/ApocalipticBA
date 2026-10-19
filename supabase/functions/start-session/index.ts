import { handleStartSession } from './handler.ts';
import { parseAllowedOrigins } from '../_shared/cors.ts';

const deps = { allowedOrigins: parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS')) };

Deno.serve((req) => handleStartSession(req, deps));
