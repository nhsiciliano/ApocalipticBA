import { describe, expect, it } from 'vitest';

import { createTestGame, scenarioWith } from '../test-utils/fixtures.ts';

const ammoScenario = () =>
  scenarioWith(
    [
      ['pickups', 2],
      { id: 'PICK_municion_pistola_1', zone: 'Z1_Hall', item: 'municion_pistola', amount: 12 },
    ],
    [
      ['pickups', 3],
      { id: 'PICK_municion_pistola_2', zone: 'Z1_Hall', item: 'municion_pistola', amount: 6 },
    ],
  );

describe('pickups', () => {
  it('collects within the radius, once, with events and light haptics', () => {
    const t = createTestGame();
    t.game.player.teleport([101.5, 0, 0]);
    t.run();
    expect(t.log.of('pickup.collected')).toEqual([]);

    t.game.player.teleport([102.2, 0, 0]);
    t.run(5);
    expect(t.log.of('pickup.collected')).toEqual([
      { pickupId: 'PICK_pistola_1', item: 'pistola', amount: 1 },
    ]);
    expect(t.log.of('inventory.changed')).toEqual([{ item: 'pistola', amount: 1 }]);
    expect(t.game.state.inventory.get('pistola')).toBe(1);
    expect(t.adapters.haptics.calls).toEqual(['light']);
    expect(t.game.world.resolved.has('PICK_pistola_1')).toBe(true);
  });

  it('ammo accumulates across pickups', () => {
    const t = createTestGame({ scenario: ammoScenario() });
    t.game.player.teleport([100, 0, 6]);
    t.run();
    t.game.player.teleport([100, 0, 9]);
    t.run();
    expect(t.game.state.inventory.get('municion_pistola')).toBe(18);
    expect(t.log.of('inventory.changed')).toEqual([
      { item: 'municion_pistola', amount: 12 },
      { item: 'municion_pistola', amount: 18 },
    ]);
  });

  it('stays consumed after respawning from a later checkpoint', () => {
    const t = createTestGame();
    t.game.player.teleport([103, 0, 0]);
    t.run();
    t.game.player.teleport([0, 0, -20]);
    t.run();
    expect(t.game.state.checkpointId).toBe('CHK_4a');

    t.game.player.damage(100);
    t.game.player.respawn();
    expect(t.game.state.inventory.get('pistola')).toBe(1);
    t.game.player.teleport([103, 0, 0]);
    t.run();
    expect(t.log.of('pickup.collected')).toHaveLength(1);
  });

  it('comes back when collected after the restored checkpoint', () => {
    const t = createTestGame();
    t.game.player.teleport([0, 0, -20]);
    t.run();
    t.game.player.teleport([103, 0, 0]);
    t.run();
    expect(t.game.state.inventory.get('pistola')).toBe(1);

    t.game.player.damage(100);
    t.game.player.respawn();
    expect(t.game.state.inventory.has('pistola')).toBe(false);
    expect(t.game.world.resolved.has('PICK_pistola_1')).toBe(false);
    t.game.player.teleport([103, 0, 0]);
    t.run();
    expect(t.log.of('pickup.collected')).toHaveLength(2);
  });

  it('pickups behind an INT_pickup are only collected by interacting', () => {
    const scenario = scenarioWith([
      ['interactables', 5],
      {
        id: 'INT_pickup_escopeta',
        zone: 'Z1_Hall',
        prompt: { 'es-AR': 'Agarrar' },
        kind: 'pickup',
        pickupId: 'PICK_escopeta_1',
      },
    ]);
    const t = createTestGame({ scenario });
    t.game.player.teleport([97, 0, 0]);
    t.run(5);
    expect(t.game.state.inventory.has('escopeta')).toBe(false);

    t.game.interaction.setCandidate('INT_pickup_escopeta');
    expect(t.log.of('interact.prompt')).toEqual([
      { id: 'INT_pickup_escopeta', prompt: 'Agarrar', kind: 'pickup' },
    ]);
    t.adapters.input.press('interact');
    t.run();
    expect(t.game.state.inventory.get('escopeta')).toBe(1);
    expect(t.log.of('interact.completed')).toEqual([{ id: 'INT_pickup_escopeta' }]);
    expect(t.game.interaction.current).toBeNull();
  });

  it('does not collect while dead', () => {
    const t = createTestGame();
    t.game.player.damage(100);
    t.game.player.teleport([103, 0, 0]);
    t.run();
    expect(t.log.of('pickup.collected')).toHaveLength(0);
  });
});
