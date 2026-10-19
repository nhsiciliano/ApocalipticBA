import { describe, expect, it, vi } from 'vitest';

import { createEventBus } from './event-bus.ts';

interface TestEvents {
  ping: { n: number };
  bare: undefined;
}

describe('createEventBus', () => {
  it('delivers typed payloads in subscription order', () => {
    const bus = createEventBus<TestEvents>();
    const calls: string[] = [];
    bus.on('ping', ({ n }) => calls.push(`a${String(n)}`));
    bus.on('ping', ({ n }) => calls.push(`b${String(n)}`));
    bus.emit('ping', { n: 1 });
    expect(calls).toEqual(['a1', 'b1']);
  });

  it('supports events without payload', () => {
    const bus = createEventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('bare', handler);
    bus.emit('bare');
    expect(handler).toHaveBeenCalledWith();
  });

  it('on returns an unsubscribe function', () => {
    const bus = createEventBus<TestEvents>();
    const handler = vi.fn();
    const off = bus.on('ping', handler);
    off();
    bus.emit('ping', { n: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('once fires a single time and can be cancelled before firing', () => {
    const bus = createEventBus<TestEvents>();
    const handler = vi.fn();
    bus.once('ping', handler);
    bus.emit('ping', { n: 1 });
    bus.emit('ping', { n: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ n: 1 });

    const cancelled = vi.fn();
    bus.once('ping', cancelled)();
    bus.emit('ping', { n: 3 });
    expect(cancelled).not.toHaveBeenCalled();
  });

  it('unsubscribing during emit does not skip other handlers', () => {
    const bus = createEventBus<TestEvents>();
    const second = vi.fn();
    const offFirst = bus.on('ping', () => {
      offFirst();
    });
    bus.on('ping', second);
    bus.emit('ping', { n: 1 });
    bus.emit('ping', { n: 2 });
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('clear removes handlers of one type or all', () => {
    const bus = createEventBus<TestEvents>();
    const ping = vi.fn();
    const bare = vi.fn();
    bus.on('ping', ping);
    bus.on('bare', bare);
    bus.clear('ping');
    bus.emit('ping', { n: 1 });
    bus.emit('bare');
    expect(ping).not.toHaveBeenCalled();
    expect(bare).toHaveBeenCalledTimes(1);
    bus.clear();
    bus.emit('bare');
    expect(bare).toHaveBeenCalledTimes(1);
  });
});
