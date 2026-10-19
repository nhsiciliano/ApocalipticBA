import { describe, expect, it } from 'vitest';

import { createNeutralIntent } from './input.ts';
import { createNullAdapters } from './null-adapters.ts';
import { createSeededRng } from './rng.ts';

describe('createSeededRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createSeededRng(1);
    const b = createSeededRng(2);
    expect(Array.from({ length: 5 }, () => a.next())).not.toEqual(
      Array.from({ length: 5 }, () => b.next()),
    );
  });

  it('returns numbers in [0, 1) with a sane spread', () => {
    const rng = createSeededRng(7);
    const values = Array.from({ length: 10_000 }, () => rng.next());
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });

  it('matches the reference mulberry32 output for seed 0', () => {
    const rng = createSeededRng(0);
    expect(rng.next()).toBeCloseTo(0.26642920868471265, 15);
  });
});

describe('createNullAdapters', () => {
  it('scripted input keeps held state and consumes pulses after one sample', () => {
    const { input } = createNullAdapters();
    expect(input.sample()).toEqual(createNeutralIntent());
    input.set({ moveY: 1, run: true });
    input.press('interact');
    expect(input.sample()).toMatchObject({ moveY: 1, run: true, interact: true });
    expect(input.sample()).toMatchObject({ moveY: 1, run: true, interact: false });
    input.clear();
    expect(input.sample()).toEqual(createNeutralIntent());
  });

  it('memory storage round-trips JSON and records saves', async () => {
    const { storage } = createNullAdapters();
    expect(await storage.load('missing')).toBeNull();
    await storage.save('k', { a: [1, 2] });
    expect(await storage.load('k')).toEqual({ a: [1, 2] });
    expect(storage.saves).toEqual([{ key: 'k', data: { a: [1, 2] } }]);
    await storage.remove('k');
    expect(await storage.load('k')).toBeNull();
  });

  it('haptics and audio record calls', () => {
    const { haptics, audio } = createNullAdapters();
    haptics.impact('light');
    haptics.notification('error');
    audio.play('sfx_a');
    audio.play('amb_b', { loop: true });
    audio.stop('sfx_a');
    audio.setAmbient(null);
    expect(haptics.calls).toEqual(['light', 'error']);
    expect(audio.calls).toEqual([
      { op: 'play', cueId: 'sfx_a', loop: false },
      { op: 'play', cueId: 'amb_b', loop: true },
      { op: 'stop', cueId: 'sfx_a' },
      { op: 'ambient', cueId: null },
    ]);
  });
});
