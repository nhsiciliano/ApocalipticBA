import { describe, expect, it } from 'vitest';

import { accumulateFrame, createStatsAccumulator, useRenderStats } from './stats.ts';

describe('accumulateFrame', () => {
  it('publishes once per window and resets the window', () => {
    const acc = createStatsAccumulator();
    const counters = { drawCalls: 3, triangles: 12 };
    for (let i = 0; i < 29; i++) expect(accumulateFrame(acc, 16.7, counters)).toBeNull();
    const stats = accumulateFrame(acc, 16.7, counters);
    expect(stats).toEqual({ fps: 60, frameTimeMs: 16.7, drawCalls: 3, triangles: 12, frames: 30 });
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
});

describe('useRenderStats', () => {
  it('updates and resets', () => {
    useRenderStats
      .getState()
      .update({ fps: 59, frameTimeMs: 17, drawCalls: 4, triangles: 8, frames: 1 });
    expect(useRenderStats.getState().fps).toBe(59);
    useRenderStats.getState().reset();
    expect(useRenderStats.getState().fps).toBe(0);
  });
});
