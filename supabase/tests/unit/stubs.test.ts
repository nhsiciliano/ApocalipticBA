import { describe, expect, it } from 'vitest';

import { ORIGIN, post } from './fakes.ts';
import { handleStartSession } from '../../functions/start-session/handler.ts';
import { handleSubmitScore } from '../../functions/submit-score/handler.ts';
import { handleSyncProgress } from '../../functions/sync-progress/handler.ts';

const deps = { allowedOrigins: [ORIGIN] };

const cases = [
  {
    name: 'start-session',
    handler: handleStartSession,
    valid: { scenarioSlug: 'constitucion', appVersion: '0.1.0', platform: 'ios' },
    invalid: { scenarioSlug: 'constitucion', appVersion: '1.0', platform: 'web' },
    invalidPaths: [['appVersion'], ['platform']],
  },
  {
    name: 'submit-score',
    handler: handleSubmitScore,
    valid: {
      sessionId: '3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b',
      token: 'signed.token',
      score: 1200,
      durationMs: 900_000,
      kills: 34,
      accuracy: 0.62,
      headshots: 8,
      notesFound: ['note_carta_1'],
    },
    invalid: {
      sessionId: 'nope',
      token: 'signed.token',
      score: -1,
      durationMs: 900_000,
      kills: 34,
      accuracy: 0.62,
      headshots: 8,
      notesFound: [],
    },
    invalidPaths: [['sessionId'], ['score']],
  },
  {
    name: 'sync-progress',
    handler: handleSyncProgress,
    valid: {
      progress: [
        {
          scenarioSlug: 'constitucion',
          completed: false,
          notesFound: ['note_carta_1'],
          updatedAt: '2026-10-19T12:00:00Z',
        },
      ],
    },
    invalid: { progress: [{ scenarioSlug: 'constitucion', completed: 'yes' }] },
    invalidPaths: [
      ['progress', 0, 'completed'],
      ['progress', 0, 'notesFound'],
      ['progress', 0, 'updatedAt'],
    ],
  },
] as const;

describe.each(cases)('$name stub', ({ name, handler, valid, invalid, invalidPaths }) => {
  const url = `http://localhost/functions/v1/${name}`;

  it('answers 501 not_implemented for a valid request', async () => {
    const response = await handler(post(url, valid), deps);
    expect(response.status).toBe(501);
    expect(await response.json()).toEqual({ error: 'not_implemented', hito: 'Fase 2' });
    expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });

  it('answers 400 with the Zod issues for an invalid request', async () => {
    const response = await handler(post(url, invalid), deps);
    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error: string;
      issues: { path: (string | number)[]; code: string; message: string }[];
    };
    expect(body.error).toBe('invalid_request');
    expect(body.issues.map((issue) => issue.path)).toEqual(invalidPaths);
    expect(body.issues.every((issue) => issue.code.length > 0 && issue.message.length > 0)).toBe(
      true,
    );
  });

  it('answers 400 invalid_json for a malformed body', async () => {
    const response = await handler(post(url, '{'), deps);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_json' });
  });

  it('handles CORS preflight', async () => {
    const response = await handler(
      new Request(url, { method: 'OPTIONS', headers: { origin: ORIGIN } }),
      deps,
    );
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });
});
