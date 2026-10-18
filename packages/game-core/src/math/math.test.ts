import { describe, expect, it } from 'vitest';

import { aabbIntersectsVerticalSegment } from './aabb';
import {
  add,
  distance,
  distanceToVerticalSegment,
  isFiniteVec3,
  length,
  lerp,
  scale,
  sub,
  vec3,
  yawTowards,
} from './vec3';

describe('vec3', () => {
  it('basic helpers return new vectors', () => {
    const a = vec3(1, 2, 3);
    expect(add(a, [1, 1, 1])).toEqual([2, 3, 4]);
    expect(sub(a, [1, 1, 1])).toEqual([0, 1, 2]);
    expect(scale(a, 2)).toEqual([2, 4, 6]);
    expect(length([3, 4, 0])).toBe(5);
    expect(distance([0, 0, 0], [0, 0, 2])).toBe(2);
    expect(lerp([0, 0, 0], [10, 20, 30], 0.5)).toEqual([5, 10, 15]);
    expect(a).toEqual([1, 2, 3]);
  });

  it('isFiniteVec3 validates shape', () => {
    expect(isFiniteVec3([1, 2, 3])).toBe(true);
    expect(isFiniteVec3([1, 2])).toBe(false);
    expect(isFiniteVec3([1, 2, Number.NaN])).toBe(false);
    expect(isFiniteVec3('x')).toBe(false);
  });

  it('distanceToVerticalSegment measures to the capsule axis', () => {
    expect(distanceToVerticalSegment([0, 1, 2], [0, 0, 0], 1.8)).toBe(2);
    expect(distanceToVerticalSegment([0, 3.8, 0], [0, 0, 0], 1.8)).toBeCloseTo(2, 9);
    expect(distanceToVerticalSegment([0, -1, 0], [0, 0, 0], 1.8)).toBe(1);
  });

  it('yawTowards follows the -Z forward convention', () => {
    expect(yawTowards([0, 0, 0], [0, 0, -1])).toBeCloseTo(0, 9);
    expect(yawTowards([0, 0, 0], [-1, 0, 0])).toBeCloseTo(Math.PI / 2, 9);
    expect(yawTowards([0, 0, 0], [0, 5, 0])).toBeNull();
  });
});

describe('aabbIntersectsVerticalSegment', () => {
  const box = { min: [-1, 0, -1], max: [1, 2, 1] } as const;
  it('detects the capsule axis inside the box', () => {
    expect(aabbIntersectsVerticalSegment(box, [0, 0, 0], 1.8)).toBe(true);
    expect(aabbIntersectsVerticalSegment(box, [0, -1.5, 0], 1.8)).toBe(true);
    expect(aabbIntersectsVerticalSegment(box, [0, 2.5, 0], 1.8)).toBe(false);
    expect(aabbIntersectsVerticalSegment(box, [0, -2, 0], 1.8)).toBe(false);
    expect(aabbIntersectsVerticalSegment(box, [1.5, 0, 0], 1.8)).toBe(false);
  });
});
