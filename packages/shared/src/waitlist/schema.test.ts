import { describe, expect, it } from 'vitest';

import { WaitlistSignupResponseSchema, WaitlistSignupSchema, isHoneypotTripped } from './schema';

describe('WaitlistSignupSchema', () => {
  it('normalizes the email (trim + lowercase)', () => {
    const parsed = WaitlistSignupSchema.parse({ email: '  Vecina@Example.COM ', locale: 'es-AR' });
    expect(parsed.email).toBe('vecina@example.com');
  });

  it.each(['', 'sin-arroba', 'a@', '@b.com', 'a b@c.com', `${'a'.repeat(250)}@b.com`])(
    'rejects the invalid email %j',
    (email) => {
      expect(WaitlistSignupSchema.safeParse({ email, locale: 'en' }).success).toBe(false);
    },
  );

  it('rejects unsupported locales and oversized source', () => {
    expect(WaitlistSignupSchema.safeParse({ email: 'a@b.com', locale: 'fr' }).success).toBe(false);
    expect(
      WaitlistSignupSchema.safeParse({ email: 'a@b.com', locale: 'en', source: 'x'.repeat(65) })
        .success,
    ).toBe(false);
  });

  it('accepts a filled honeypot but flags it', () => {
    const bot = WaitlistSignupSchema.parse({
      email: 'bot@example.com',
      locale: 'en',
      website: 'https://spam.example',
    });
    expect(isHoneypotTripped(bot)).toBe(true);
  });

  it.each([undefined, '', '   '])('does not flag an empty honeypot (%j)', (website) => {
    expect(isHoneypotTripped(website === undefined ? {} : { website })).toBe(false);
  });
});

describe('WaitlistSignupResponseSchema', () => {
  it('accepts ok and each error code, and rejects the rest', () => {
    expect(WaitlistSignupResponseSchema.safeParse({ ok: true }).success).toBe(true);
    for (const error of ['invalid_email', 'rate_limited', 'duplicate', 'internal']) {
      expect(WaitlistSignupResponseSchema.safeParse({ ok: false, error }).success).toBe(true);
    }
    expect(WaitlistSignupResponseSchema.safeParse({ ok: false }).success).toBe(false);
    expect(WaitlistSignupResponseSchema.safeParse({ ok: false, error: 'boom' }).success).toBe(
      false,
    );
    expect(WaitlistSignupResponseSchema.safeParse({ ok: true, error: 'internal' }).success).toBe(
      false,
    );
  });
});
