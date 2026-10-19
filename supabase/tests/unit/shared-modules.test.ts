import { describe, expect, it } from 'vitest';

import { cors, guardRequest, parseAllowedOrigins } from '../../functions/_shared/cors.ts';
import { requireEnv, serviceRoleKey } from '../../functions/_shared/env.ts';
import { json, readJson } from '../../functions/_shared/json.ts';
import { bucketKey, clientIp, EMAIL_RULE, IP_RULE } from '../../functions/_shared/rate-limit.ts';

const URL = 'http://localhost/functions/v1/x';

describe('cors', () => {
  it('parses ALLOWED_ORIGINS with a local default', () => {
    expect(parseAllowedOrigins(undefined)).toEqual(['http://localhost:4321']);
    expect(parseAllowedOrigins(' ')).toEqual(['http://localhost:4321']);
    expect(parseAllowedOrigins('https://a.com, https://b.com,')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('echoes allowed origins and lets non-browser requests through', () => {
    const allowed = cors(new Request(URL, { headers: { origin: 'https://a.com' } }), [
      'https://a.com',
    ]);
    expect(allowed.allowed).toBe(true);
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://a.com');
    expect(allowed.headers.get('access-control-allow-headers')).toContain('apikey');
    expect(allowed.headers.get('vary')).toBe('Origin');

    const native = cors(new Request(URL), ['https://a.com']);
    expect(native.allowed).toBe(true);
    expect(native.headers.has('access-control-allow-origin')).toBe(false);

    const evil = cors(new Request(URL, { headers: { origin: 'https://evil.com' } }), [
      'https://a.com',
    ]);
    expect(evil.allowed).toBe(false);
    expect(evil.headers.has('access-control-allow-origin')).toBe(false);
  });

  it('guardRequest answers preflight, foreign origins and wrong methods', () => {
    const origins = ['https://a.com'];
    const preflight = new Request(URL, { method: 'OPTIONS', headers: { origin: 'https://a.com' } });
    expect(guardRequest(preflight, cors(preflight, origins))?.status).toBe(204);

    const foreign = new Request(URL, { method: 'POST', headers: { origin: 'https://x.com' } });
    expect(guardRequest(foreign, cors(foreign, origins))?.status).toBe(403);

    const get = new Request(URL);
    const response = guardRequest(get, cors(get, origins));
    expect(response?.status).toBe(405);
    expect(response?.headers.get('allow')).toBe('POST, OPTIONS');

    const postReq = new Request(URL, { method: 'POST' });
    expect(guardRequest(postReq, cors(postReq, origins))).toBeNull();
  });
});

describe('rate-limit helpers', () => {
  it('rules match the waitlist policy', () => {
    expect(IP_RULE).toEqual({ max: 5, windowSeconds: 600 });
    expect(EMAIL_RULE).toEqual({ max: 3, windowSeconds: 86_400 });
  });

  it('bucketKey is a salted sha-256 that never contains the raw value', async () => {
    const a = await bucketKey('ip', '1.2.3.4', 'salt');
    expect(a).toMatch(/^ip:[0-9a-f]{64}$/);
    expect(a).not.toContain('1.2.3.4');
    expect(await bucketKey('ip', '1.2.3.4', 'salt')).toBe(a);
    expect(await bucketKey('ip', '1.2.3.4', 'other')).not.toBe(a);
    expect((await bucketKey('email', '1.2.3.4', 'salt')).slice(6)).not.toBe(a.slice(3));
  });

  it('clientIp takes the first x-forwarded-for entry', () => {
    const req = (value?: string) =>
      new Request(URL, value === undefined ? {} : { headers: { 'x-forwarded-for': value } });
    expect(clientIp(req('203.0.113.7, 172.18.0.1'))).toBe('203.0.113.7');
    expect(clientIp(req(' 2001:db8::1 '))).toBe('2001:db8::1');
    expect(clientIp(req(''))).toBe('unknown');
    expect(clientIp(req())).toBe('unknown');
  });
});

describe('json helpers', () => {
  it('json sets status, content type and extra headers', async () => {
    const response = json({ ok: true }, 201, new Headers({ vary: 'Origin' }));
    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('vary')).toBe('Origin');
    expect(await response.json()).toEqual({ ok: true });
  });

  it('readJson returns undefined for invalid bodies', async () => {
    expect(await readJson(new Request(URL, { method: 'POST', body: '{"a":1}' }))).toEqual({ a: 1 });
    expect(await readJson(new Request(URL, { method: 'POST', body: '{nope' }))).toBeUndefined();
  });
});

describe('env helpers', () => {
  const reader = (values: Record<string, string>) => (name: string) => values[name];

  it('prefers SUPABASE_SERVICE_ROLE_KEY and falls back to SUPABASE_SECRET_KEYS', () => {
    expect(serviceRoleKey(reader({ SUPABASE_SERVICE_ROLE_KEY: 'legacy' }))).toBe('legacy');
    expect(
      serviceRoleKey(reader({ SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_x' }) })),
    ).toBe('sb_secret_x');
    expect(() => serviceRoleKey(reader({}))).toThrow(/Missing/);
    expect(() => serviceRoleKey(reader({ SUPABASE_SECRET_KEYS: '{}' }))).toThrow(/Missing/);
  });

  it('requireEnv rejects missing or empty values', () => {
    expect(requireEnv(reader({ A: 'x' }), 'A')).toBe('x');
    expect(() => requireEnv(reader({ A: '' }), 'A')).toThrow('Missing env A');
    expect(() => requireEnv(reader({}), 'B')).toThrow('Missing env B');
  });
});
