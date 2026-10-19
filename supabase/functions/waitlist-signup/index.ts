import type { Database } from '@apocalipticba/shared';
import { createClient } from '@supabase/supabase-js';

import { handleWaitlistSignup } from './handler.ts';
import { createWaitlistStore } from './store.ts';
import { parseAllowedOrigins } from '../_shared/cors.ts';
import { requireEnv, serviceRoleKey } from '../_shared/env.ts';

const env = (name: string) => Deno.env.get(name);

const supabase = createClient<Database>(requireEnv(env, 'SUPABASE_URL'), serviceRoleKey(env), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const deps = {
  store: createWaitlistStore(supabase),
  now: () => new Date(),
  salt: requireEnv(env, 'RATE_LIMIT_SALT'),
  allowedOrigins: parseAllowedOrigins(env('ALLOWED_ORIGINS')),
  logError: (message: string, error: unknown) => {
    console.error(message, error);
  },
};

Deno.serve((req) => handleWaitlistSignup(req, deps));
