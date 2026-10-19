import { describe, expect, it, vi } from 'vitest';

import { createFakeStore, ORIGIN, post } from './fakes.ts';
import { bucketKey } from '../../functions/_shared/rate-limit.ts';
import {
  handleWaitlistSignup,
  type WaitlistDeps,
  type WaitlistStore,
} from '../../functions/waitlist-signup/handler.ts';

const URL = 'http://localhost/functions/v1/waitlist-signup';
const T0 = new Date('2026-10-19T12:00:00Z');

function setup(overrides: Partial<WaitlistDeps> = {}) {
  const fake = createFakeStore();
  let now = T0;
  const deps: WaitlistDeps = {
    store: fake.store,
    now: () => now,
    salt: 'test-salt',
    allowedOrigins: [ORIGIN],
    ...overrides,
  };
  return {
    ...fake,
    deps,
    advance(ms: number) {
      now = new Date(now.getTime() + ms);
    },
    send(body: unknown, ip = '203.0.113.1') {
      return handleWaitlistSignup(post(URL, body, { 'x-forwarded-for': ip }), deps);
    },
  };
}

const valid = { email: 'Vecina@Example.com ', locale: 'es-AR', source: 'landing-hero' };

describe('waitlist-signup', () => {
  it('stores a valid signup normalized and answers ok with CORS headers', async () => {
    const t = setup();
    const response = await t.send(valid);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(t.rows).toEqual([
      { email: 'vecina@example.com', locale: 'es-AR', source: 'landing-hero' },
    ]);
  });

  it('omits source when the form does not send it', async () => {
    const t = setup();
    await t.send({ email: 'a@example.com', locale: 'en' });
    expect(t.rows).toEqual([{ email: 'a@example.com', locale: 'en' }]);
  });

  it('honeypot answers ok without inserting', async () => {
    const t = setup();
    const response = await t.send({ ...valid, website: 'http://spam.example' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(t.rows).toEqual([]);
  });

  it.each([
    ['an invalid email', { email: 'not-an-email', locale: 'es-AR' }],
    ['a missing locale', { email: 'a@example.com' }],
    ['an unknown locale', { email: 'a@example.com', locale: 'pt-BR' }],
    ['extra fields', { email: 'a@example.com', locale: 'en', admin: true }],
    ['malformed JSON', '{nope'],
  ])('rejects %s with 400 invalid_email', async (_label, body) => {
    const t = setup();
    const response = await t.send(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'invalid_email' });
    expect(t.rows).toEqual([]);
  });

  it('duplicates answer ok (idempotent, no email enumeration)', async () => {
    const t = setup();
    await t.send(valid);
    const second = await t.send(valid, '203.0.113.2');
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ ok: true });
    expect(t.rows).toHaveLength(1);
  });

  it('limits each IP to 5 requests per 10 minutes', async () => {
    const t = setup();
    for (let i = 0; i < 5; i += 1) {
      expect((await t.send({ email: `p${String(i)}@example.com`, locale: 'en' })).status).toBe(200);
    }
    const blocked = await t.send({ email: 'p5@example.com', locale: 'en' });
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ ok: false, error: 'rate_limited' });
    expect((await t.send(valid, '198.51.100.9')).status).toBe(200);

    t.advance(10 * 60 * 1000);
    expect((await t.send({ email: 'p6@example.com', locale: 'en' })).status).toBe(200);
    expect(t.rows).toHaveLength(7);
  });

  it('counts invalid requests against the IP limit too', async () => {
    const t = setup();
    for (let i = 0; i < 5; i += 1) await t.send({ email: 'bad', locale: 'en' });
    expect((await t.send(valid)).status).toBe(429);
  });

  it('limits each email to 3 attempts per day across IPs', async () => {
    const t = setup();
    for (let i = 0; i < 3; i += 1) {
      expect((await t.send(valid, `192.0.2.${String(i)}`)).status).toBe(200);
    }
    expect((await t.send(valid, '192.0.2.50')).status).toBe(429);
    t.advance(24 * 60 * 60 * 1000 - 1);
    expect((await t.send(valid, '192.0.2.51')).status).toBe(429);
    t.advance(1);
    expect((await t.send(valid, '192.0.2.52')).status).toBe(200);
  });

  it('rate-limit buckets are salted hashes, never raw IPs or emails', async () => {
    const t = setup();
    await t.send(valid, '203.0.113.1');
    expect(t.buckets).toEqual([
      await bucketKey('ip', '203.0.113.1', 'test-salt'),
      await bucketKey('email', 'vecina@example.com', 'test-salt'),
    ]);
    expect(t.buckets.join()).not.toMatch(/203\.0\.113\.1|vecina/);
  });

  it('hides internal errors behind a 500 internal and logs them', async () => {
    const logError = vi.fn();
    const failing: WaitlistStore = {
      bumpRateLimit: () => Promise.resolve(true),
      insert: () => Promise.reject(new Error('connection refused at 10.0.0.3')),
    };
    const t = setup({ store: failing, logError });
    const response = await t.send(valid);
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ ok: false, error: 'internal' });
    expect(text).not.toContain('10.0.0.3');
    expect(logError).toHaveBeenCalledWith('waitlist-signup failed', expect.any(Error));
  });

  it('answers CORS preflight and rejects foreign origins and other methods', async () => {
    const t = setup();
    const preflight = await handleWaitlistSignup(
      new Request(URL, { method: 'OPTIONS', headers: { origin: ORIGIN } }),
      t.deps,
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');

    const foreign = await handleWaitlistSignup(
      post(URL, valid, { origin: 'https://evil.example' }),
      t.deps,
    );
    expect(foreign.status).toBe(403);

    const get = await handleWaitlistSignup(new Request(URL), t.deps);
    expect(get.status).toBe(405);
    expect(t.buckets).toEqual([]);
  });
});
