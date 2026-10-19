import type { Database } from '@apocalipticba/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { IP_RULE } from '../../functions/_shared/rate-limit.ts';
import { createWaitlistStore } from '../../functions/waitlist-signup/store.ts';

interface Result {
  data: unknown;
  error: { code?: string; message: string } | null;
}

function fakeClient(rpcResult: Result, insertResult: Pick<Result, 'error'>) {
  const insert = vi.fn(() => Promise.resolve(insertResult));
  const client = {
    rpc: vi.fn(() => Promise.resolve(rpcResult)),
    from: vi.fn(() => ({ insert })),
  };
  return { client, insert, supabase: client as unknown as SupabaseClient<Database> };
}

describe('createWaitlistStore', () => {
  it('maps bumpRateLimit to the bump_rate_limit RPC', async () => {
    const fake = fakeClient({ data: true, error: null }, { error: null });
    const store = createWaitlistStore(fake.supabase);
    const now = new Date('2026-10-19T12:00:00Z');
    expect(await store.bumpRateLimit('ip:abc', IP_RULE, now)).toBe(true);
    expect(fake.client.rpc).toHaveBeenCalledWith('bump_rate_limit', {
      p_bucket: 'ip:abc',
      p_max: 5,
      p_window_seconds: 600,
      p_now: '2026-10-19T12:00:00.000Z',
    });
  });

  it('throws when the RPC fails', async () => {
    const fake = fakeClient({ data: null, error: { message: 'boom' } }, { error: null });
    await expect(
      createWaitlistStore(fake.supabase).bumpRateLimit('b', IP_RULE, new Date()),
    ).rejects.toThrow('bump_rate_limit: boom');
  });

  it('inserts rows and maps unique violations to duplicate', async () => {
    const ok = fakeClient({ data: true, error: null }, { error: null });
    expect(await createWaitlistStore(ok.supabase).insert({ email: 'a@b.co', locale: 'en' })).toBe(
      'inserted',
    );
    expect(ok.client.from).toHaveBeenCalledWith('waitlist');
    expect(ok.insert).toHaveBeenCalledWith({ email: 'a@b.co', locale: 'en', source: null });

    const dup = fakeClient(
      { data: true, error: null },
      { error: { code: '23505', message: 'dup' } },
    );
    expect(await createWaitlistStore(dup.supabase).insert({ email: 'a@b.co', locale: 'en' })).toBe(
      'duplicate',
    );

    const broken = fakeClient(
      { data: true, error: null },
      { error: { code: '42501', message: 'denied' } },
    );
    await expect(
      createWaitlistStore(broken.supabase).insert({ email: 'a@b.co', locale: 'en', source: 's' }),
    ).rejects.toThrow('waitlist insert: denied');
  });
});
