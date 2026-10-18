import { describe, expect, it } from 'vitest';

import { createNullAdapters } from '../adapters/null-adapters';
import type { CheckpointSnapshot } from '../game/snapshot';
import { createTestGame } from '../test-utils/fixtures';

const INSIDE_4A = [0, 0, -20] as const;
const CHK_4A_POSITION = [0, 0, -20] as const;

function setupWithCheckpoint() {
  const t = createTestGame();
  // Carta leída + pistola + flag antes del checkpoint.
  t.game.player.teleport([100, 0, 0]);
  t.game.interaction.setCandidate('INT_note_carta_1');
  t.adapters.input.press('interact');
  t.run();
  t.game.interaction.closeNote();
  t.game.player.teleport([103, 0, 0]);
  t.run();
  t.game.player.teleport([1, 0, -19]);
  t.adapters.input.set({ lookDeltaX: 0.25 });
  t.run();
  t.adapters.input.clear();
  return t;
}

describe('checkpoints', () => {
  it('checkpoint.save snapshots the run and persists it under save:<scenario>', async () => {
    const t = setupWithCheckpoint();
    expect(t.log.of('checkpoint.saved')).toEqual([{ id: 'CHK_4a' }]);
    expect(t.game.state.checkpointId).toBe('CHK_4a');

    await t.game.save();
    const first = t.adapters.storage.saves[0];
    expect(first?.key).toBe('save:constitucion');
    const snapshot = first?.data as CheckpointSnapshot;
    expect(snapshot).toMatchObject({
      version: 1,
      scenarioId: 'constitucion',
      checkpointId: 'CHK_4a',
      health: 100,
      inventory: [['pistola', 1]],
      flags: [],
      objectiveIndex: 1,
      consumedPickups: ['PICK_pistola_1'],
      crossedOneways: [],
      openedGates: [],
      completedHolds: [],
      firedTriggers: ['TRG_esquina_4a'],
      notesFound: ['note_carta_1'],
    });
    expect(snapshot.position).toEqual([1, 0, -19]);
    expect(snapshot.yaw).toBeCloseTo(-0.25, 9);
    expect(snapshot.elapsedMs).toBeCloseTo(3000 / 60, 6);
    expect(t.adapters.storage.saves).toHaveLength(2);
  });

  it('damage reduces health and kills at zero', () => {
    const t = createTestGame();
    t.game.player.damage(40);
    expect(t.game.state.health).toBe(60);
    expect(t.log.of('player.health')).toEqual([{ health: 60, maxHealth: 100 }]);
    expect(t.adapters.haptics.calls).toEqual(['medium']);

    t.game.player.damage(0);
    t.game.player.damage(Number.NaN);
    expect(t.game.state.health).toBe(60);

    t.game.player.damage(100);
    expect(t.game.state.health).toBe(0);
    expect(t.game.state.phase).toBe('dead');
    expect(t.log.of('player.died')).toHaveLength(1);
    expect(t.adapters.haptics.calls).toEqual(['medium', 'heavy', 'error']);

    t.game.player.damage(5);
    expect(t.log.of('player.died')).toHaveLength(1);
  });

  it('respawn restores position, inventory, objective and flags from the last checkpoint', () => {
    const t = setupWithCheckpoint();
    t.game.world.debugEndEncounter('enc_4a');
    expect(t.game.state.flags.has('enc_4a_cleared')).toBe(true);
    t.game.player.teleport([97, 0, 0]);
    t.run();
    expect(t.game.state.inventory.get('escopeta')).toBe(1);

    t.game.player.damage(150);
    t.log.clear();
    t.game.player.respawn();

    expect(t.game.player.position).toEqual(CHK_4A_POSITION);
    expect(t.game.player.yaw).toBe(Math.PI);
    expect(t.game.state.health).toBe(100);
    expect(t.game.state.phase).toBe('playing');
    expect([...t.game.state.inventory]).toEqual([['pistola', 1]]);
    expect(t.game.state.flags.size).toBe(0);
    expect(t.game.state.objective?.id).toBe('obj_forzar_sacristia');
    expect(t.game.state.zone).toBe('Z4_Lateral');
    expect(t.log.all.map((event) => event.type)).toEqual([
      'zone.changed',
      'player.phase',
      'checkpoint.restored',
      'player.health',
      'objective.changed',
      'player.respawned',
    ]);
    expect(t.log.of('player.respawned')).toEqual([{ checkpointId: 'CHK_4a' }]);

    // Reaparecer dentro del trigger ya disparado no lo vuelve a disparar.
    t.run(5);
    expect(t.log.of('trigger.fired')).toEqual([]);
  });

  it('respawn without any checkpoint returns to the player spawn', () => {
    const t = createTestGame();
    t.game.player.teleport([103, 0, 0]);
    t.run();
    t.game.player.damage(100);
    t.game.player.respawn();
    expect(t.game.player.position).toEqual([100, 0, 0]);
    expect(t.game.state.checkpointId).toBeNull();
    expect(t.game.state.inventory.size).toBe(0);
    expect(t.log.of('player.respawned')).toEqual([{ checkpointId: null }]);
  });

  it('uses the saved position when the checkpoint node is not registered', () => {
    const t = setupWithCheckpoint();
    t.game.world.unregisterZone('Z4_Lateral');
    t.game.player.respawn();
    expect(t.game.player.position).toEqual([1, 0, -19]);
  });

  it('respawning before a crossed oneway makes its zones available again', () => {
    const t = setupWithCheckpoint();
    t.game.player.teleport([0, 4, 2]);
    t.run();
    expect(t.game.world.loadedZones.has('Z2_Plaza')).toBe(false);
    t.game.player.damage(100);
    t.log.clear();
    t.game.player.respawn();
    expect(t.game.world.resolved.has('COL_oneway_andamio')).toBe(false);
    expect(t.log.of('zone.preload')).toEqual([{ zones: ['Z2_Plaza', 'Z3_Frente'] }]);
    t.game.world.registerZoneNodes('Z3_Frente', [
      { id: 'INT_locked_reja', kind: 'interactable', position: [50, 0, 0] },
    ]);
    expect(t.game.world.loadedZones.has('Z3_Frente')).toBe(true);
  });

  it('load() restores the stored checkpoint into a fresh game', async () => {
    const t = setupWithCheckpoint();
    await t.game.save();

    const adapters = createNullAdapters();
    for (const [key, json] of t.adapters.storage.data) {
      await adapters.storage.save(key, JSON.parse(json));
    }
    const fresh = createTestGame({ adapters });
    expect(fresh.game.player.position).toEqual([100, 0, 0]);
    expect(await fresh.game.load()).toBe(true);
    expect(fresh.game.player.position).toEqual(CHK_4A_POSITION);
    expect(fresh.game.state.checkpointId).toBe('CHK_4a');
    expect(fresh.game.state.objective?.id).toBe('obj_forzar_sacristia');
    expect(fresh.game.state.inventory.get('pistola')).toBe(1);
    expect(fresh.game.state.elapsedMs).toBeCloseTo(3000 / 60, 6);
    expect(fresh.game.state.notesFound.has('note_carta_1')).toBe(true);
    expect(fresh.log.of('checkpoint.restored')).toEqual([{ id: 'CHK_4a' }]);
    expect(fresh.log.of('zone.changed')).toEqual([{ from: 'Z1_Hall', to: 'Z4_Lateral' }]);
  });

  it('load() returns false for missing, foreign or corrupt saves', async () => {
    const t = createTestGame();
    expect(await t.game.load()).toBe(false);

    const valid = (await (async () => {
      const source = setupWithCheckpoint();
      await source.game.save();
      return source.adapters.storage.saves[0]?.data;
    })()) as Record<string, unknown>;

    const cases: [unknown, RegExp][] = [
      ['nope', /not an object/],
      [{ ...valid, version: 2 }, /version/],
      [{ ...valid, scenarioId: 'otro' }, /scenario mismatch/],
      [{ ...valid, checkpointId: 'CHK_99' }, /unknown checkpoint/],
      [{ ...valid, position: [0, 0] }, /position/],
      [{ ...valid, yaw: 'x' }, /yaw/],
      [{ ...valid, objectiveIndex: 7 }, /objectiveIndex/],
      [{ ...valid, inventory: [['bazooka', 1]] }, /inventory/],
      [{ ...valid, flags: [1] }, /flags/],
    ];
    for (const [data, reason] of cases) {
      await t.adapters.storage.save('save:constitucion', data);
      expect(await t.game.load()).toBe(false);
      expect(t.log.of('debug.warn').at(-1)?.message).toMatch(reason);
    }
  });

  it('reports storage failures on the debug channel', async () => {
    const adapters = createNullAdapters();
    adapters.storage.save = () => Promise.reject(new Error('disk full'));
    const t = createTestGame({ adapters });
    t.game.player.teleport(INSIDE_4A);
    t.run();
    await t.game.save();
    expect(t.log.of('debug.warn').map((event) => event.message)).toContain(
      'Saving save:constitucion failed: disk full',
    );
  });

  it('save() without a checkpoint does not touch storage', async () => {
    const t = createTestGame();
    await t.game.save();
    expect(t.adapters.storage.saves).toEqual([]);
  });
});
