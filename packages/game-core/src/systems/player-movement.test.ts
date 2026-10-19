import { describe, expect, it } from 'vitest';

import { createTestGame, DT } from '../test-utils/fixtures.ts';

const SPAWN = [100, 0, 0] as const;

describe('player movement', () => {
  it('starts at the registered player spawn', () => {
    const { game } = createTestGame();
    expect(game.player.position).toEqual(SPAWN);
    expect(game.player.yaw).toBe(0);
    expect(game.player.grounded).toBe(true);
  });

  it('walks, runs and crouches at the configured speeds along -Z for yaw 0', () => {
    const t = createTestGame();
    t.adapters.input.set({ moveY: 1 });
    t.run(60);
    expect(t.game.player.position[2]).toBeCloseTo(-4, 9);
    expect(t.game.player.position[0]).toBeCloseTo(100, 9);

    t.game.player.teleport(SPAWN);
    t.adapters.input.set({ moveY: 1, run: true });
    t.run(60);
    expect(t.game.player.position[2]).toBeCloseTo(-7, 9);

    t.game.player.teleport(SPAWN);
    t.adapters.input.set({ moveY: 1, run: true, crouch: true });
    t.run(60);
    expect(t.game.player.position[2]).toBeCloseTo(-2, 9);
    expect(t.game.player.crouching).toBe(true);
  });

  it('normalizes diagonal input and strafes along +X', () => {
    const t = createTestGame();
    t.adapters.input.set({ moveX: 1, moveY: 1 });
    t.run(60);
    const [x, , z] = t.game.player.position;
    expect(Math.hypot(x - 100, z)).toBeCloseTo(4, 9);
    expect(x - 100).toBeCloseTo(4 / Math.SQRT2, 9);
    expect(z).toBeCloseTo(-4 / Math.SQRT2, 9);
  });

  it('ignores non-finite axes and clamps out-of-range ones', () => {
    const t = createTestGame();
    t.adapters.input.set({ moveX: Number.NaN, moveY: 5, lookDeltaX: Number.NaN });
    t.run(60);
    expect(t.game.player.position[0]).toBeCloseTo(100, 9);
    expect(t.game.player.position[2]).toBeCloseTo(-4, 9);
    expect(t.game.player.yaw).toBe(0);
  });

  it('yaw rotates the movement axis', () => {
    const t = createTestGame();
    t.game.player.teleport(SPAWN, Math.PI / 2);
    t.adapters.input.set({ moveY: 1 });
    t.run(60);
    expect(t.game.player.position[0]).toBeCloseTo(96, 9);
    expect(t.game.player.position[2]).toBeCloseTo(0, 9);
  });

  it('look deltas turn right with positive X and up with positive Y, scaled by sensitivity', () => {
    const t = createTestGame({ settings: { lookSensitivity: 2 } });
    t.adapters.input.set({ lookDeltaX: 0.1, lookDeltaY: 0.05 });
    t.run();
    expect(t.game.player.yaw).toBeCloseTo(-0.2, 9);
    expect(t.game.player.pitch).toBeCloseTo(0.1, 9);
  });

  it('wraps yaw into (-PI, PI]', () => {
    const t = createTestGame();
    t.adapters.input.set({ lookDeltaX: -1 });
    t.run(4);
    expect(t.game.player.yaw).toBeCloseTo(4 - 2 * Math.PI, 9);
    t.adapters.input.set({ lookDeltaX: 1 });
    t.run(8);
    expect(t.game.player.yaw).toBeCloseTo(-4 + 2 * Math.PI, 9);
  });

  it('clamps pitch to ±89° and honours invertY', () => {
    const t = createTestGame();
    t.adapters.input.set({ lookDeltaY: 10 });
    t.run();
    expect(t.game.player.pitch).toBeCloseTo((89 * Math.PI) / 180, 9);
    t.adapters.input.set({ lookDeltaY: -100 });
    t.run();
    expect(t.game.player.pitch).toBeCloseTo((-89 * Math.PI) / 180, 9);

    const inverted = createTestGame({ settings: { invertY: true } });
    inverted.adapters.input.set({ lookDeltaY: 0.1 });
    inverted.run();
    expect(inverted.game.player.pitch).toBeCloseTo(-0.1, 9);
  });

  it('jumps only when grounded and integrates gravity until landing on groundY', () => {
    const t = createTestGame();
    t.adapters.input.press('jump');
    t.run();
    expect(t.game.player.velocity[1]).toBeCloseTo(4.5, 9);
    expect(t.game.player.grounded).toBe(false);
    expect(t.game.player.position[1]).toBeCloseTo(4.5 * DT, 9);

    t.adapters.input.press('jump');
    t.run();
    expect(t.game.player.velocity[1]).toBeCloseTo(4.5 - 20 * DT, 9);

    let maxY = 0;
    for (let i = 0; i < 60 && !t.game.player.grounded; i += 1) {
      t.run();
      maxY = Math.max(maxY, t.game.player.position[1]);
    }
    expect(maxY).toBeGreaterThan(0.45);
    expect(maxY).toBeLessThan(0.55);
    expect(t.game.player.grounded).toBe(true);
    expect(t.game.player.position[1]).toBe(0);
    expect(t.game.player.velocity[1]).toBe(0);
  });

  it('falls from a height and lands exactly on the spawn ground', () => {
    const t = createTestGame();
    t.game.player.teleport([100, 5, 0]);
    expect(t.game.player.grounded).toBe(false);
    t.run(120);
    expect(t.game.player.position[1]).toBe(0);
    expect(t.game.player.grounded).toBe(true);
  });

  it('exposes desiredDelta and eye height', () => {
    const t = createTestGame();
    t.adapters.input.set({ moveY: 1 });
    t.run();
    expect(t.game.player.desiredDelta[2]).toBeCloseTo(-4 * DT, 9);
    expect(t.game.player.eyeHeight).toBeCloseTo(1.8 * 0.9, 9);
    expect(t.game.player.height).toBeCloseTo(1.8, 9);
    t.adapters.input.set({ crouch: true });
    t.run();
    expect(t.game.player.eyeHeight).toBeCloseTo(1.2 * 0.9, 9);
  });

  it('commitMove is authoritative once the host resolves collisions', () => {
    const t = createTestGame();
    t.adapters.input.set({ moveY: 1 });
    t.run();
    t.game.player.commitMove({ position: [1, 2, 3], grounded: true });
    expect(t.game.player.position).toEqual([1, 2, 3]);

    t.run();
    // El core ya no aplica el delta: espera el próximo commitMove.
    expect(t.game.player.position).toEqual([1, 2, 3]);
    expect(t.game.player.desiredDelta[2]).toBeCloseTo(-4 * DT, 9);
    expect(t.game.player.desiredDelta[1]).toBeCloseTo(-20 * DT * DT, 9);

    t.game.player.commitMove({ position: [1, 2, 2.9], grounded: true });
    expect(t.game.player.velocity[1]).toBe(0);
  });

  it('commitMove zeroes upward velocity on ceiling hits and rejects invalid positions', () => {
    const t = createTestGame();
    t.adapters.input.press('jump');
    t.run();
    t.game.player.commitMove({ position: [100, 0.05, 0], grounded: false, hitCeiling: true });
    expect(t.game.player.velocity[1]).toBe(0);

    t.game.player.commitMove({ position: [Number.NaN, 0, 0], grounded: true });
    expect(t.game.player.position).toEqual([100, 0.05, 0]);
    expect(t.log.of('debug.warn')).toHaveLength(1);
  });

  it('teleport validates its input', () => {
    const t = createTestGame();
    t.game.player.teleport([1, Number.POSITIVE_INFINITY, 0]);
    expect(t.game.player.position).toEqual(SPAWN);
    expect(t.log.of('debug.warn')).toHaveLength(1);
  });

  it('ignores move, look and jump input while reading a note', () => {
    const t = createTestGame();
    t.game.interaction.setCandidate('INT_note_carta_1');
    t.adapters.input.press('interact');
    t.run();
    expect(t.game.state.phase).toBe('reading_note');

    t.adapters.input.set({ moveY: 1, lookDeltaX: 1, crouch: true });
    t.adapters.input.press('jump');
    t.run(30);
    expect(t.game.player.position).toEqual(SPAWN);
    expect(t.game.player.yaw).toBe(0);
    expect(t.game.player.crouching).toBe(false);
  });

  it('ignores movement input and commitMove while climbing', () => {
    const t = createTestGame();
    t.game.player.teleport([0, 0, 0]);
    t.game.interaction.setCandidate('INT_climb_andamio');
    t.adapters.input.press('interact');
    t.run();
    expect(t.game.state.phase).toBe('climbing');

    t.adapters.input.set({ moveX: 1, moveY: 1 });
    t.run(10);
    expect(t.game.player.position[0]).toBeCloseTo(0, 9);
    t.game.player.commitMove({ position: [50, 50, 50], grounded: true });
    expect(t.game.player.position[0]).toBeCloseTo(0, 9);
  });

  it('freezes the player when dead', () => {
    const t = createTestGame();
    t.game.player.damage(1000);
    t.adapters.input.set({ moveY: 1 });
    t.run(10);
    expect(t.game.player.position).toEqual(SPAWN);
    expect(t.game.player.desiredDelta).toEqual([0, 0, 0]);
  });
});
