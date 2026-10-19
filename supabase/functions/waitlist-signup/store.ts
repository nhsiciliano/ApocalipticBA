import type { Database } from '@apocalipticba/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { WaitlistStore } from './handler.ts';

/** Código de Postgres para violación de unique. */
const UNIQUE_VIOLATION = '23505';

/** `WaitlistStore` sobre supabase-js con la clave de servicio (bypassa RLS). */
export function createWaitlistStore(supabase: SupabaseClient<Database>): WaitlistStore {
  return {
    async bumpRateLimit(bucket, rule, now) {
      const { data, error } = await supabase.rpc('bump_rate_limit', {
        p_bucket: bucket,
        p_max: rule.max,
        p_window_seconds: rule.windowSeconds,
        p_now: now.toISOString(),
      });
      if (error) throw new Error(`bump_rate_limit: ${error.message}`);
      return data;
    },
    async insert(entry) {
      const { error } = await supabase.from('waitlist').insert({
        email: entry.email,
        locale: entry.locale,
        source: entry.source ?? null,
      });
      if (error === null) return 'inserted';
      if (error.code === UNIQUE_VIOLATION) return 'duplicate';
      throw new Error(`waitlist insert: ${error.message}`);
    },
  };
}
