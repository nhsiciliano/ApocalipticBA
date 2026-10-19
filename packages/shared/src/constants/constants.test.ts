import { describe, expect, it } from 'vitest';

import { METEORITE_PALETTE } from './meteorite-palette.ts';
import { QUALITY_LEVELS } from './quality.ts';

describe('METEORITE_PALETTE', () => {
  it('uses valid hex colors for every color key', () => {
    const colors = [
      METEORITE_PALETTE.core,
      METEORITE_PALETTE.glow,
      METEORITE_PALETTE.mid,
      METEORITE_PALETTE.dark,
      METEORITE_PALETTE.skyTint,
      METEORITE_PALETTE.blood,
    ];
    for (const color of colors) expect(color).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('defines sky tint opacity and a 1.5 s pulse', () => {
    expect(METEORITE_PALETTE.skyTintOpacity).toBeGreaterThan(0);
    expect(METEORITE_PALETTE.skyTintOpacity).toBeLessThanOrEqual(1);
    expect(METEORITE_PALETTE.pulsePeriodMs).toBe(1500);
  });
});

describe('QUALITY_LEVELS', () => {
  it('defines low, medium and high', () => {
    expect(Object.keys(QUALITY_LEVELS)).toEqual(['low', 'medium', 'high']);
  });

  it('scales up monotonically with quality', () => {
    const { low, medium, high } = QUALITY_LEVELS;
    expect(low.maxAnimatedZombies).toBeLessThan(medium.maxAnimatedZombies);
    expect(medium.maxAnimatedZombies).toBeLessThan(high.maxAnimatedZombies);
    expect(low.renderScale).toBeLessThan(medium.renderScale);
    expect(medium.renderScale).toBeLessThan(high.renderScale);
  });

  it('enables Sobel and bloom only in high', () => {
    expect(QUALITY_LEVELS.high).toMatchObject({
      outlines: 'hull+sobel',
      bloom: true,
      glow: 'bloom',
      sobelScale: 0.5,
    });
    for (const level of [QUALITY_LEVELS.low, QUALITY_LEVELS.medium]) {
      expect(level).toMatchObject({ outlines: 'hull', bloom: false, glow: 'billboards' });
      expect('sobelScale' in level).toBe(false);
    }
  });
});
