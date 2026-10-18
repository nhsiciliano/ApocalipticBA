import { describe, expect, it, vi } from 'vitest';

import { createFixedStepLoop } from './fixed-step';

const STEP = 1000 / 60;

describe('createFixedStepLoop', () => {
  it('runs one step per ~16.7 ms frame', () => {
    const onStep = vi.fn();
    const loop = createFixedStepLoop({ onStep });
    loop.advance(16.7);
    loop.advance(16.7);
    loop.advance(16.7);
    expect(onStep).toHaveBeenCalledTimes(3);
    expect(onStep.mock.calls).toEqual([
      [1 / 60, 0],
      [1 / 60, 1],
      [1 / 60, 2],
    ]);
    expect(loop.accumulatorMs).toBeCloseTo(50.1 - 3 * STEP, 9);
    expect(loop.droppedMs).toBe(0);
  });

  it('accumulates short frames until a full step is available', () => {
    const onStep = vi.fn();
    const loop = createFixedStepLoop({ onStep });
    loop.advance(8);
    expect(onStep).not.toHaveBeenCalled();
    loop.advance(9);
    expect(onStep).toHaveBeenCalledTimes(1);
  });

  it('clamps long frames to maxSubSteps and reports the dropped time', () => {
    const onStep = vi.fn();
    const loop = createFixedStepLoop({ onStep });
    loop.advance(100);
    expect(onStep).toHaveBeenCalledTimes(5);
    expect(loop.droppedMs).toBeCloseTo(100 - 5 * STEP, 9);
    expect(loop.accumulatorMs).toBeLessThan(STEP);

    loop.advance(1000);
    expect(onStep).toHaveBeenCalledTimes(10);
    expect(loop.droppedMs).toBeCloseTo(100 - 5 * STEP + 1000 - 5 * STEP, 9);
  });

  it('honours custom stepMs and maxSubSteps', () => {
    const onStep = vi.fn();
    const loop = createFixedStepLoop({ stepMs: 10, maxSubSteps: 2, onStep });
    loop.advance(35);
    expect(onStep).toHaveBeenCalledTimes(2);
    expect(onStep).toHaveBeenLastCalledWith(0.01, 1);
    expect(loop.droppedMs).toBeCloseTo(15, 9);
  });

  it('passes alpha = accumulator / stepMs to onRender after the steps', () => {
    const order: string[] = [];
    const alphas: number[] = [];
    const loop = createFixedStepLoop({
      stepMs: 10,
      onStep: () => order.push('step'),
      onRender: (alpha) => {
        order.push('render');
        alphas.push(alpha);
      },
    });
    loop.advance(25);
    expect(order).toEqual(['step', 'step', 'render']);
    expect(alphas[0]).toBeCloseTo(0.5, 9);
    loop.advance(2.5);
    expect(alphas[1]).toBeCloseTo(0.75, 9);
  });

  it('ignores zero, negative and non-finite frame deltas', () => {
    const onStep = vi.fn();
    const onRender = vi.fn();
    const loop = createFixedStepLoop({ onStep, onRender });
    loop.advance(0);
    loop.advance(-5);
    loop.advance(Number.NaN);
    loop.advance(Number.POSITIVE_INFINITY);
    expect(onStep).not.toHaveBeenCalled();
    expect(onRender).not.toHaveBeenCalled();
    expect(loop.accumulatorMs).toBe(0);
  });

  it('reset clears the accumulator, dropped time and step index', () => {
    const onStep = vi.fn();
    const loop = createFixedStepLoop({ onStep });
    loop.advance(100);
    loop.advance(10);
    loop.reset();
    expect(loop.accumulatorMs).toBe(0);
    expect(loop.droppedMs).toBe(0);
    loop.advance(STEP);
    expect(onStep).toHaveBeenLastCalledWith(1 / 60, 0);
  });

  it('is deterministic for the same frame sequence', () => {
    const frames = [16.7, 33.4, 5, 120, 16.6, 16.7, 0.1];
    const run = () => {
      const steps: number[] = [];
      const loop = createFixedStepLoop({ onStep: (_dt, index) => steps.push(index) });
      for (const frame of frames) loop.advance(frame);
      return { steps, accumulatorMs: loop.accumulatorMs, droppedMs: loop.droppedMs };
    };
    expect(run()).toEqual(run());
  });

  it('rejects invalid options', () => {
    expect(() => createFixedStepLoop({ stepMs: 0, onStep: vi.fn() })).toThrow(RangeError);
    expect(() => createFixedStepLoop({ maxSubSteps: 0, onStep: vi.fn() })).toThrow(RangeError);
    expect(() => createFixedStepLoop({ maxSubSteps: 1.5, onStep: vi.fn() })).toThrow(RangeError);
  });

  it('exposes stepMs', () => {
    expect(createFixedStepLoop({ onStep: vi.fn() }).stepMs).toBe(STEP);
  });
});
