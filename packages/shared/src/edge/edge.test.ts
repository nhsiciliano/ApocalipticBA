import { describe, expect, it } from 'vitest';

import {
  StartSessionRequestSchema,
  StartSessionResponseSchema,
  SubmitScoreRequestSchema,
  SubmitScoreResponseSchema,
  SyncProgressRequestSchema,
  SyncProgressResponseSchema,
} from './index.ts';

const sessionId = '3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b';

describe('start-session', () => {
  const request = { scenarioSlug: 'constitucion', appVersion: '0.1.0', platform: 'ios' };

  it('accepts a valid request and semver variants', () => {
    expect(StartSessionRequestSchema.safeParse(request).success).toBe(true);
    for (const appVersion of ['1.0.0-beta.1', '2.3.4+build.5', '10.20.30']) {
      expect(StartSessionRequestSchema.safeParse({ ...request, appVersion }).success).toBe(true);
    }
  });

  it.each([
    ['appVersion', '1.0'],
    ['appVersion', '01.0.0'],
    ['platform', 'web'],
    ['scenarioSlug', 'Constitución'],
  ])('rejects an invalid %s (%j)', (field, value) => {
    expect(StartSessionRequestSchema.safeParse({ ...request, [field]: value }).success).toBe(false);
  });

  it('validates the response', () => {
    const response = { sessionId, token: 'signed.token', expiresAt: '2026-10-18T20:00:00Z' };
    expect(StartSessionResponseSchema.safeParse(response).success).toBe(true);
    expect(StartSessionResponseSchema.safeParse({ ...response, sessionId: 'abc' }).success).toBe(
      false,
    );
    expect(StartSessionResponseSchema.safeParse({ ...response, expiresAt: 'mañana' }).success).toBe(
      false,
    );
  });
});

describe('submit-score', () => {
  const request = {
    sessionId,
    token: 'signed.token',
    score: 1200,
    durationMs: 900_000,
    kills: 34,
    accuracy: 0.62,
    headshots: 8,
    notesFound: ['note_carta_1'],
  };

  it('accepts a valid request', () => {
    expect(SubmitScoreRequestSchema.safeParse(request).success).toBe(true);
  });

  it.each([
    ['score', -1],
    ['score', 1.5],
    ['durationMs', 0],
    ['kills', -3],
    ['accuracy', 1.01],
    ['accuracy', -0.1],
    ['headshots', 0.5],
    ['sessionId', 'no-uuid'],
    ['token', ''],
    ['notesFound', [1]],
  ])('rejects an invalid %s (%j)', (field, value) => {
    expect(SubmitScoreRequestSchema.safeParse({ ...request, [field]: value }).success).toBe(false);
  });

  it('validates the response, with optional rank and reason', () => {
    expect(SubmitScoreResponseSchema.safeParse({ accepted: true, rank: 3 }).success).toBe(true);
    expect(
      SubmitScoreResponseSchema.safeParse({ accepted: false, reason: 'implausible' }).success,
    ).toBe(true);
    expect(SubmitScoreResponseSchema.safeParse({ accepted: false, reason: 'nope' }).success).toBe(
      false,
    );
    expect(SubmitScoreResponseSchema.safeParse({ accepted: true, rank: 0 }).success).toBe(false);
  });
});

describe('sync-progress', () => {
  const entry = {
    scenarioSlug: 'constitucion',
    bestTimeMs: 1_300_000,
    completed: true,
    notesFound: ['note_carta_1', 'note_carta_2'],
    updatedAt: '2026-10-18T12:00:00+00:00',
  };

  it('accepts entries with or without bestTimeMs', () => {
    expect(SyncProgressRequestSchema.safeParse({ progress: [entry] }).success).toBe(true);
    const withoutTime = Object.fromEntries(
      Object.entries(entry).filter(([key]) => key !== 'bestTimeMs'),
    );
    expect(SyncProgressRequestSchema.safeParse({ progress: [withoutTime] }).success).toBe(true);
  });

  it('rejects malformed entries', () => {
    const invalid = [
      { ...entry, notesFound: ['carta_1'] },
      { ...entry, bestTimeMs: -5 },
      { ...entry, updatedAt: 'ayer' },
      { ...entry, scenarioSlug: 'Línea C' },
    ];
    for (const bad of invalid) {
      expect(SyncProgressRequestSchema.safeParse({ progress: [bad] }).success).toBe(false);
    }
  });

  it('validates the response', () => {
    expect(SyncProgressResponseSchema.safeParse({ merged: [entry], conflicts: 1 }).success).toBe(
      true,
    );
    expect(SyncProgressResponseSchema.safeParse({ merged: [entry], conflicts: -1 }).success).toBe(
      false,
    );
  });
});
