import { handleSyncProgress } from './handler.ts';
import { parseAllowedOrigins } from '../_shared/cors.ts';

const deps = { allowedOrigins: parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS')) };

Deno.serve((req) => handleSyncProgress(req, deps));
