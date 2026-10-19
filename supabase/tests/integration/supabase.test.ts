import { randomInt, randomUUID } from 'node:crypto';

import type { Database } from '@apocalipticba/shared';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

const stack = inject('stack');

type Client = SupabaseClient<Database>;

function client(key: string): Client {
  if (stack === null) throw new Error('stack not available');
  return createClient<Database>(stack.apiUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe.skipIf(stack === null)('local Supabase stack', () => {
  const runId = randomUUID().slice(0, 8);
  // Rango de benchmarking (RFC 2544): una IP por corrida.
  const ip = `198.18.${String(randomInt(0, 256))}.${String(randomInt(1, 255))}`;
  const email = (n: number) => `it-${runId}-${String(n)}@example.com`;

  let service: Client;
  let anon: Client;
  const createdUsers: string[] = [];

  const signup = (body: unknown) =>
    fetch(`${stack?.functionsUrl ?? ''}/waitlist-signup`, {
      method: 'POST',
      headers: {
        apikey: stack?.anonKey ?? '',
        'content-type': 'application/json',
        origin: stack?.allowedOrigin ?? '',
        'x-forwarded-for': ip,
      },
      body: JSON.stringify(body),
    });

  const waitlistRows = async (address: string) => {
    const { data, error } = await service.from('waitlist').select('*').eq('email', address);
    expect(error).toBeNull();
    return data ?? [];
  };

  beforeAll(() => {
    if (stack === null) return;
    service = client(stack.serviceKey);
    anon = client(stack.anonKey);
  });

  afterAll(async () => {
    if (stack === null) return;
    await service.from('waitlist').delete().like('email', `it-${runId}-%`);
    for (const id of createdUsers) await service.auth.admin.deleteUser(id);
  });

  describe('waitlist-signup', () => {
    it('stores a valid signup (checked with the service role)', async () => {
      const response = await signup({ email: email(1), locale: 'es-AR', source: 'it' });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      const rows = await waitlistRows(email(1));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ email: email(1), locale: 'es-AR', source: 'it' });
    });

    it('anon cannot read the waitlist (criterio 7.12)', async () => {
      const { data, error } = await anon.from('waitlist').select('*');
      console.info('anon select waitlist →', JSON.stringify({ data, error }));
      expect(data === null || data.length === 0).toBe(true);
      expect(error?.code).toBe('42501');
    });

    it('a repeated email answers ok without a second row', async () => {
      const response = await signup({ email: email(1), locale: 'es-AR' });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(await waitlistRows(email(1))).toHaveLength(1);
    });

    it('the sixth request from the same IP within 10 minutes is rate limited', async () => {
      for (const n of [2, 3, 4]) {
        expect((await signup({ email: email(n), locale: 'en' })).status).toBe(200);
      }
      const blocked = await signup({ email: email(5), locale: 'en' });
      expect(blocked.status).toBe(429);
      expect(await blocked.json()).toEqual({ ok: false, error: 'rate_limited' });
      expect(await waitlistRows(email(5))).toHaveLength(0);
    });
  });

  describe('RLS with the anon key', () => {
    it('cannot insert scores or sessions', async () => {
      const { data: scenario } = await anon
        .from('scenarios')
        .select('id')
        .eq('slug', 'constitucion')
        .single();
      const scoreInsert = await anon.from('scores').insert({
        session_id: randomUUID(),
        scenario_id: scenario?.id ?? randomUUID(),
        score: 1,
        duration_ms: 1,
      });
      console.info('anon insert scores →', JSON.stringify(scoreInsert.error));
      expect(scoreInsert.error?.code).toBe('42501');

      const sessionInsert = await anon.from('game_sessions').insert({
        scenario_id: scenario?.id ?? randomUUID(),
        app_version: '0.1.0',
        platform: 'ios',
        token_hash: 'x',
      });
      expect(sessionInsert.error?.code).toBe('42501');
    });

    it('reads the public catalog', async () => {
      const { data, error } = await anon.from('scenarios').select('slug, "order", is_active');
      expect(error).toBeNull();
      expect(data).toEqual(
        expect.arrayContaining([
          { slug: 'constitucion', order: 1, is_active: true },
          { slug: 'linea-c', order: 2, is_active: false },
        ]),
      );
      const weapons = await anon.from('weapons').select('slug');
      expect(weapons.data?.map((weapon) => weapon.slug).sort()).toEqual(['escopeta', 'pistola']);
      const config = await anon.from('remote_config').select('key, value');
      expect(config.data).toEqual(
        expect.arrayContaining([{ key: 'min_app_version', value: '0.1.0' }]),
      );
    });

    it('top_scores is empty before any validated score', async () => {
      const { data, error } = await anon.rpc('top_scores', { p_scenario_slug: 'constitucion' });
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('cannot call the rate limiter', async () => {
      const { error } = await anon.rpc('bump_rate_limit', {
        p_bucket: 'x',
        p_max: 1,
        p_window_seconds: 1,
      });
      expect(error?.code).toBe('42501');
    });
  });

  describe('RLS for anonymous players', () => {
    let alice: Client;
    let bob: Client;
    let aliceId: string;
    let scenarioId: string;

    beforeAll(async () => {
      if (stack === null) return;
      alice = client(stack.anonKey);
      bob = client(stack.anonKey);
      const a = await alice.auth.signInAnonymously();
      const b = await bob.auth.signInAnonymously();
      expect(a.error).toBeNull();
      expect(b.error).toBeNull();
      aliceId = a.data.user?.id ?? '';
      createdUsers.push(aliceId, b.data.user?.id ?? '');
      const { data } = await alice
        .from('scenarios')
        .select('id')
        .eq('slug', 'constitucion')
        .single();
      scenarioId = data?.id ?? '';
    });

    it('signup creates the own profile through handle_new_user', async () => {
      const { data, error } = await alice.from('profiles').select('user_id, display_name');
      expect(error).toBeNull();
      expect(data).toEqual([{ user_id: aliceId, display_name: null }]);
      const others = await bob.from('profiles').select('user_id').eq('user_id', aliceId);
      expect(others.data).toEqual([]);
    });

    it('a player writes and reads their own progress', async () => {
      const { error } = await alice.from('player_progress').upsert({
        user_id: aliceId,
        scenario_id: scenarioId,
        completed: true,
        best_time_ms: 1_300_000,
        notes_found: ['note_carta_1'],
      });
      expect(error).toBeNull();
      const { data } = await alice.from('player_progress').select('completed, best_time_ms');
      expect(data).toEqual([{ completed: true, best_time_ms: 1_300_000 }]);
    });

    it("another player cannot read, insert or update someone else's progress", async () => {
      const read = await bob.from('player_progress').select('*').eq('user_id', aliceId);
      expect(read.data).toEqual([]);

      const insert = await bob.from('player_progress').insert({
        user_id: aliceId,
        scenario_id: scenarioId,
        completed: false,
      });
      console.info('foreign insert player_progress →', JSON.stringify(insert.error));
      expect(insert.error?.code).toBe('42501');

      const update = await bob
        .from('player_progress')
        .update({ completed: false })
        .eq('user_id', aliceId)
        .select();
      expect(update.data).toEqual([]);

      const { data } = await service
        .from('player_progress')
        .select('completed')
        .eq('user_id', aliceId)
        .single();
      expect(data?.completed).toBe(true);
    });

    it('the public leaderboard shows validated scores with the display name', async () => {
      const named = await alice
        .from('profiles')
        .update({ display_name: 'Vecina' })
        .eq('user_id', aliceId)
        .select();
      expect(named.error).toBeNull();

      const session = await service
        .from('game_sessions')
        .insert({
          user_id: aliceId,
          scenario_id: scenarioId,
          app_version: '0.1.0',
          platform: 'ios',
          token_hash: 'test',
        })
        .select('id')
        .single();
      expect(session.error).toBeNull();
      const sessionId = session.data?.id ?? '';
      await service.from('scores').insert([
        {
          session_id: sessionId,
          user_id: aliceId,
          scenario_id: scenarioId,
          score: 4200,
          duration_ms: 1_300_000,
          accuracy: 0.5,
          validated: true,
        },
      ]);

      try {
        const { data, error } = await anon.rpc('top_scores', { p_scenario_slug: 'constitucion' });
        expect(error).toBeNull();
        expect(data).toEqual([
          expect.objectContaining({ rank: 1, display_name: 'Vecina', score: 4200 }),
        ]);
        const own = await alice.from('game_sessions').select('id');
        expect(own.data).toEqual([{ id: sessionId }]);
        const foreign = await bob.from('game_sessions').select('id');
        expect(foreign.data).toEqual([]);
      } finally {
        await service.from('game_sessions').delete().eq('id', sessionId);
      }
    });

    it('stub functions validate with the shared schemas behind the gateway', async () => {
      const { data } = await alice.auth.getSession();
      const call = (body: unknown) =>
        fetch(`${stack?.functionsUrl ?? ''}/start-session`, {
          method: 'POST',
          headers: {
            apikey: stack?.anonKey ?? '',
            authorization: `Bearer ${data.session?.access_token ?? ''}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      const ok = await call({ scenarioSlug: 'constitucion', appVersion: '0.1.0', platform: 'ios' });
      expect(ok.status).toBe(501);
      expect(await ok.json()).toEqual({ error: 'not_implemented', hito: 'Fase 2' });
      const bad = await call({ scenarioSlug: 'constitucion', appVersion: '1', platform: 'ios' });
      expect(bad.status).toBe(400);
    });
  });
});
