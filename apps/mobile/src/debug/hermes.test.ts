import { afterEach, describe, expect, it } from 'vitest';

import { readHermesStats, readJsHeapMb } from './hermes.ts';

const globals = globalThis as { HermesInternal?: unknown };

afterEach(() => {
  delete globals.HermesInternal;
});

describe('readHermesStats', () => {
  it('returns null outside Hermes', () => {
    expect(readHermesStats()).toBeNull();
    expect(readJsHeapMb()).toBeNull();
  });

  it('reads the heap size when Hermes exposes it', () => {
    globals.HermesInternal = { getInstrumentedStats: () => ({ js_heapSize: 20 * 1048576 }) };
    expect(readJsHeapMb()).toBe(20);
  });

  it('falls back to allocated bytes', () => {
    expect(readJsHeapMb({ js_allocatedBytes: 1.5 * 1048576 })).toBe(1.5);
  });
});
