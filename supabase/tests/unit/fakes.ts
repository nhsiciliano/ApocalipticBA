import type { WaitlistSignup } from '@apocalipticba/shared';

import type { RateLimitRule } from '../../functions/_shared/rate-limit.ts';
import type { WaitlistStore } from '../../functions/waitlist-signup/handler.ts';

/** Store en memoria con la misma semántica de ventana fija que `bump_rate_limit` en SQL. */
export function createFakeStore() {
  const counters = new Map<string, { count: number; windowStart: number }>();
  const rows: Omit<WaitlistSignup, 'website'>[] = [];
  const buckets: string[] = [];
  const store: WaitlistStore = {
    bumpRateLimit(bucket: string, rule: RateLimitRule, now: Date) {
      buckets.push(bucket);
      const current = counters.get(bucket);
      const expired =
        current === undefined || current.windowStart <= now.getTime() - rule.windowSeconds * 1000;
      const next = expired
        ? { count: 1, windowStart: now.getTime() }
        : { count: current.count + 1, windowStart: current.windowStart };
      counters.set(bucket, next);
      return Promise.resolve(next.count <= rule.max);
    },
    insert(entry) {
      if (rows.some((row) => row.email === entry.email)) return Promise.resolve('duplicate');
      rows.push(entry);
      return Promise.resolve('inserted');
    },
  };
  return { store, rows, buckets };
}

export const ORIGIN = 'http://localhost:4321';

export function post(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
