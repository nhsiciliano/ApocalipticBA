import { describe, expect, it } from 'vitest';

import { RunRecorder, summarizeRun } from './summary.ts';

describe('summarizeRun', () => {
  it('summarizes an empty run as zeros', () => {
    expect(summarizeRun([], { drawCalls: 0, triangles: 0 })).toEqual({
      frames: 0,
      durationMs: 0,
      fpsAvg: 0,
      fpsP1: 0,
      frameTimeAvgMs: 0,
      frameTimeP50Ms: 0,
      frameTimeP99Ms: 0,
      frameTimeMaxMs: 0,
      drawCalls: 0,
      triangles: 0,
    });
  });

  it('computes averages and percentiles', () => {
    const deltas = [...Array.from({ length: 99 }, () => 10), 50];
    const summary = summarizeRun(deltas, { drawCalls: 120, triangles: 700000 });
    expect(summary.frames).toBe(100);
    expect(summary.durationMs).toBe(1040);
    expect(summary.fpsAvg).toBe(96.2);
    expect(summary.frameTimeP50Ms).toBe(10);
    expect(summary.frameTimeP99Ms).toBe(10);
    expect(summary.frameTimeMaxMs).toBe(50);
    expect(summary.fpsP1).toBe(100);
    expect(summary.drawCalls).toBe(120);
  });
});

describe('RunRecorder', () => {
  it('returns the summary once the duration is reached', () => {
    const recorder = new RunRecorder(100);
    const counters = { drawCalls: 1, triangles: 1 };
    for (let i = 0; i < 9; i++) expect(recorder.tick(10, counters)).toBeNull();
    expect(recorder.tick(10, counters)?.frames).toBe(10);
  });
});
