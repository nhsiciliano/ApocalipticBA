import { describe, expect, it } from 'vitest';

import { expectedNodesForZone, sceneNodeKindForId } from './scene-nodes';
import { createNullAdapters } from '../adapters/null-adapters';
import { createGame } from '../game/create-game';
import {
  createTestGame,
  minimalScenario,
  nodesForZone,
  recordEvents,
} from '../test-utils/fixtures';

describe('scene node helpers', () => {
  it('expectedNodesForZone lists the gameplay nodes of a zone', () => {
    const scenario = minimalScenario();
    expect([...expectedNodesForZone(scenario, 'Z1_Hall')].sort()).toEqual([
      'INT_gate_salida_hall',
      'INT_note_carta_1',
      'PICK_escopeta_1',
      'PICK_pistola_1',
      'SPAWN_player_start_1',
    ]);
    expect(expectedNodesForZone(scenario, 'BG_Skyline').size).toBe(0);
  });

  it('sceneNodeKindForId maps prefixes to kinds', () => {
    expect(sceneNodeKindForId('TRG_a')).toBe('trigger');
    expect(sceneNodeKindForId('COL_oneway_a')).toBe('oneway');
    expect(sceneNodeKindForId('SPAWN_enc_a_1')).toBe('spawn');
    expect(sceneNodeKindForId('CHK_1')).toBe('checkpoint');
    expect(sceneNodeKindForId('MRK_a')).toBe('marker');
    expect(sceneNodeKindForId('PICK_pistola_1')).toBe('pickup');
    expect(sceneNodeKindForId('INT_note_a')).toBe('interactable');
    expect(sceneNodeKindForId('COL_pared')).toBeNull();
  });
});

describe('world port', () => {
  const setup = () => {
    const scenario = minimalScenario();
    const game = createGame({ scenario, adapters: createNullAdapters() });
    return { scenario, game, log: recordEvents(game) };
  };

  it('registers and unregisters zones', () => {
    const { scenario, game, log } = setup();
    game.world.registerZoneNodes('Z1_Hall', nodesForZone(scenario, 'Z1_Hall'));
    game.world.registerZoneNodes('BG_Skyline', []);
    expect([...game.world.loadedZones]).toEqual(['Z1_Hall', 'BG_Skyline']);
    expect(game.player.position).toEqual([100, 0, 0]);
    expect(log.of('debug.warn')).toEqual([]);

    game.world.unregisterZone('Z1_Hall');
    game.world.unregisterZone('Z1_Hall');
    expect([...game.world.loadedZones]).toEqual(['BG_Skyline']);
  });

  it('throws on nodes the scenario does not declare for that zone', () => {
    const { game } = setup();
    expect(() =>
      game.world.registerZoneNodes('Z1_Hall', [
        {
          id: 'TRG_esquina_4a',
          kind: 'trigger',
          position: [0, 0, 0],
          aabb: { min: [0, 0, 0], max: [1, 1, 1] },
        },
      ]),
    ).toThrow(
      'Scene node "TRG_esquina_4a" is not declared for zone Z1_Hall in scenario "constitucion"',
    );
    expect(game.world.loadedZones.size).toBe(0);
  });

  it('throws on a kind that does not match the id prefix', () => {
    const { game } = setup();
    expect(() =>
      game.world.registerZoneNodes('Z1_Hall', [
        { id: 'PICK_pistola_1', kind: 'interactable', position: [0, 0, 0] },
      ]),
    ).toThrow(/registered as "interactable" but its prefix means "pickup"/);
  });

  it('throws on duplicate ids and unknown zones', () => {
    const { game } = setup();
    const node = { id: 'PICK_pistola_1', kind: 'pickup', position: [0, 0, 0] } as const;
    expect(() => game.world.registerZoneNodes('Z1_Hall', [node, node])).toThrow(/Duplicate/);
    expect(() => game.world.registerZoneNodes('Z9' as 'Z1_Hall', [])).toThrow(
      /not part of scenario/,
    );
    expect(() => {
      game.world.setCurrentZone('Z9' as 'Z1_Hall');
    }).toThrow(/not part of scenario/);
  });

  it('warns about expected nodes missing from the glTF', () => {
    const { game, log } = setup();
    game.world.registerZoneNodes('Z3_Frente', []);
    expect(log.of('debug.warn')).toEqual([
      { message: 'Zone Z3_Frente registered without nodes: INT_locked_reja' },
    ]);
    expect(game.world.loadedZones.has('Z3_Frente')).toBe(true);
  });

  it('re-registering a zone replaces its nodes', () => {
    const { scenario, game } = setup();
    game.world.registerZoneNodes('Z1_Hall', nodesForZone(scenario, 'Z1_Hall'));
    game.world.registerZoneNodes(
      'Z1_Hall',
      nodesForZone(scenario, 'Z1_Hall').map((node) =>
        node.id === 'PICK_pistola_1' ? { ...node, position: [200, 0, 0] as const } : node,
      ),
    );
    game.step(1 / 60);
    game.player.teleport([103, 0, 0]);
    game.step(1 / 60);
    expect(game.state.inventory.has('pistola')).toBe(false);
    game.player.teleport([200, 0, 0]);
    game.step(1 / 60);
    expect(game.state.inventory.has('pistola')).toBe(true);
  });

  it('the spawn only places the player the first time but always sets the ground', () => {
    const { scenario, game } = setup();
    game.player.teleport([5, 5, 5]);
    game.world.registerZoneNodes(
      'Z1_Hall',
      nodesForZone(scenario, 'Z1_Hall').map((node) =>
        node.kind === 'spawn' ? { ...node, position: [100, 2, 0] as const } : node,
      ),
    );
    expect(game.player.position).toEqual([5, 5, 5]);
    for (let i = 0; i < 120; i += 1) game.step(1 / 60);
    expect(game.player.position[1]).toBe(2);
  });

  it('setCurrentZone announces the change and preloads unloaded neighbours', () => {
    const t = createTestGame({ zones: ['Z1_Hall', 'Z2_Plaza'] });
    t.game.world.setCurrentZone('Z1_Hall');
    expect(t.log.all).toEqual([]);
    t.game.world.setCurrentZone('Z2_Plaza');
    expect(t.log.of('zone.changed')).toEqual([{ from: 'Z1_Hall', to: 'Z2_Plaza' }]);
    expect(t.log.of('zone.preload')).toEqual([{ zones: ['Z3_Frente'] }]);
    expect(t.game.state.zone).toBe('Z2_Plaza');
    t.game.world.setCurrentZone('Z5_Interior');
    expect(t.log.of('zone.preload')).toHaveLength(1);
  });
});
