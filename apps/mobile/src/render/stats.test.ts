import { describe, expect, it } from 'vitest';

import {
  RECENT_FRAMES,
  accumulateFrame,
  createStatsAccumulator,
  percentile,
  useRenderStats,
} from './stats.ts';

describe('percentile', () => {
  it('returns 0 without values', () => {
    expect(percentile([], 0.99)).toBe(0);
  });

  it('uses the nearest rank on a sorted copy', () => {
    const values = [30, 10, 20, 40, 50];
    expect(percentile(values, 0.5)).toBe(30);
    expect(percentile(values, 0.99)).toBe(50);
    expect(percentile(values, 0)).toBe(10);
    expect(values).toEqual([30, 10, 20, 40, 50]);
  });
});

describe('accumulateFrame', () => {
  it('publishes once per window and resets the window', () => {
    const acc = createStatsAccumulator();
    const counters = { drawCalls: 3, triangles: 12 };
    for (let i = 0; i < 29; i++) expect(accumulateFrame(acc, 16.7, counters)).toBeNull();
    const stats = accumulateFrame(acc, 16.7, counters);
    expect(stats).toEqual({
      fps: 60,
      frameTimeMs: 16.7,
      frameTimeP99Ms: 16.7,
      fpsP1: 60,
      drawCalls: 3,
      triangles: 12,
      frames: 30,
      jsHeapMb: null,
    });
    expect(acc.frames).toBe(0);
    expect(acc.elapsedMs).toBe(0);
    expect(acc.totalFrames).toBe(30);
  });

  it('keeps counting total frames across windows', () => {
    const acc = createStatsAccumulator();
    const counters = { drawCalls: 1, triangles: 2 };
    accumulateFrame(acc, 600, counters);
    const second = accumulateFrame(acc, 600, counters);
    expect(second?.frames).toBe(2);
    expect(second?.fps).toBe(2);
  });

  it('reports the worst 1 % of recent frames as p99 and caps the history', () => {
    const acc = createStatsAccumulator();
    const counters = { drawCalls: 1, triangles: 2 };
    for (let i = 0; i < RECENT_FRAMES + 50; i++) accumulateFrame(acc, 10, counters);
    expect(acc.recent).toHaveLength(RECENT_FRAMES);
    // Tres frames lentos sobre 240 retenidos: el rango p99 (238.º de 240) cae en ellos.
    accumulateFrame(acc, 500, counters);
    accumulateFrame(acc, 500, counters);
    const stats = accumulateFrame(acc, 500, counters);
    expect(stats?.frameTimeP99Ms).toBe(500);
    expect(stats?.fpsP1).toBe(2);
  });
});

describe('useRenderStats', () => {
  it('updates and resets', () => {
    useRenderStats.getState().update({
      fps: 59,
      frameTimeMs: 17,
      frameTimeP99Ms: 25,
      fpsP1: 40,
      drawCalls: 4,
      triangles: 8,
      frames: 1,
      jsHeapMb: 12.5,
    });
    expect(useRenderStats.getState().fps).toBe(59);
    expect(useRenderStats.getState().jsHeapMb).toBe(12.5);
    useRenderStats.getState().reset();
    expect(useRenderStats.getState().fps).toBe(0);
  });
});
