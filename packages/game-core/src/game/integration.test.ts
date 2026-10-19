import { describe, expect, it } from 'vitest';

import { createGame } from './create-game.ts';
import { createNullAdapters } from '../adapters/null-adapters.ts';
import { fullRunScenario, nodesForZone, recordEvents } from '../test-utils/fixtures.ts';

/**
 * Recorrido sintético del escenario 1 (fixture de shared + segunda carta en Z5), con un host falso
 * que carga zonas cuando el core las pide. Sin colisiones: el core aplica `desiredDelta` directo.
 */
describe('integration: Z1 → Z5', () => {
  it('plays the whole scenario through the public API', async () => {
    const scenario = fullRunScenario();
    const adapters = createNullAdapters();
    const game = createGame({ scenario, adapters });
    const log = recordEvents(game);

    // Host: carga la zona inicial y su vecina; después carga lo que el core pida.
    const load = (zone: Parameters<typeof game.world.registerZoneNodes>[0]) => {
      game.world.registerZoneNodes(zone, nodesForZone(scenario, zone));
    };
    game.events.on('zone.preload', ({ zones }) => {
      zones.forEach(load);
    });
    load('Z1_Hall');
    load('Z2_Plaza');

    let steps = 0;
    const run = (n = 1) => {
      for (let i = 0; i < n; i += 1) {
        game.step(1 / 60);
        steps += 1;
      }
    };
    const interact = () => {
      adapters.input.press('interact');
      run();
    };

    // Z1: despertar y leer la carta.
    expect(game.player.position).toEqual([100, 0, 0]);
    game.interaction.setCandidate('INT_note_carta_1');
    interact();
    expect(game.state.phase).toBe('reading_note');
    run(120);
    interact();
    expect(game.state.objective?.id).toBe('obj_forzar_sacristia');

    // Z1: la salida pide las dos armas.
    game.player.teleport([100, 0, -9]);
    game.interaction.setCandidate('INT_gate_salida_hall');
    interact();
    expect(log.of('interact.locked').at(-1)?.id).toBe('INT_gate_salida_hall');

    game.player.teleport([100, 0, 0]);
    game.interaction.setCandidate(null);
    adapters.input.set({ moveX: 1 });
    run(40);
    adapters.input.clear();
    expect(game.state.inventory.get('pistola')).toBe(1);
    game.player.teleport([97.5, 0, 0]);
    run();
    expect(game.state.inventory.get('escopeta')).toBe(1);

    game.player.teleport([100, 0, -9]);
    game.interaction.setCandidate('INT_gate_salida_hall');
    interact();
    expect(log.of('interact.completed').at(-1)).toEqual({ id: 'INT_gate_salida_hall' });

    // Z2 → Z3: la reja está cerrada.
    game.world.setCurrentZone('Z2_Plaza');
    game.world.setCurrentZone('Z3_Frente');
    expect(game.world.loadedZones.has('Z4_Lateral')).toBe(true);
    game.player.teleport([50, 0, 1.5]);
    game.interaction.setCandidate('INT_locked_reja');
    interact();
    expect(log.of('interact.locked').at(-1)).toEqual({
      id: 'INT_locked_reja',
      message: 'Está cerrada. Tiene que haber otra entrada.',
    });

    // Z4a: la esquina guarda checkpoint y arranca el encuentro.
    game.world.setCurrentZone('Z4_Lateral');
    expect(game.world.loadedZones.has('Z5_Interior')).toBe(true);
    game.interaction.setCandidate(null);
    game.player.teleport([0, 0, -15], 0);
    adapters.input.set({ moveY: 1 });
    run(60);
    adapters.input.clear();
    expect(game.state.checkpointId).toBe('CHK_4a');
    expect(log.of('encounter.start')).toEqual([{ id: 'enc_4a' }]);
    game.world.debugEndEncounter('enc_4a');
    expect(game.state.flags.has('enc_4a_cleared')).toBe(true);

    // Z4c: trepar el andamio cruza el oneway y descarga Z2/Z3.
    game.player.teleport([0, 0, -0.5]);
    game.interaction.setCandidate('INT_climb_andamio');
    interact();
    expect(game.state.phase).toBe('climbing');
    run(150);
    expect(game.state.phase).toBe('playing');
    expect(game.player.position).toEqual([0, 4.2, 1.8]);
    expect(log.of('oneway.crossed')).toEqual([
      { id: 'COL_oneway_andamio', unloadZones: ['Z2_Plaza', 'Z3_Frente'] },
    ]);
    expect(log.of('zone.unload')).toEqual([{ zones: ['Z2_Plaza', 'Z3_Frente'] }]);
    expect([...game.world.loadedZones].sort()).toEqual(['Z1_Hall', 'Z4_Lateral', 'Z5_Interior']);
    expect(game.state.checkpointId).toBe('CHK_4c');

    // Cae al patio (modo sin colisión) y fuerza la puerta: 6 s acumulables.
    run(60);
    expect(game.player.grounded).toBe(true);
    game.player.teleport([0, 0, 2.5]);
    game.interaction.setCandidate('INT_hold_sacristia');
    adapters.input.set({ interactHeld: true });
    run(200);
    adapters.input.set({ interactHeld: false });
    run(30);
    expect(game.interaction.current?.progress).toBeCloseTo(200 / 360, 9);
    adapters.input.set({ interactHeld: true });
    run(160);
    adapters.input.clear();
    expect(log.of('interact.completed').at(-1)).toEqual({ id: 'INT_hold_sacristia' });
    expect(game.state.objective).toEqual({
      id: 'obj_leer_carta_2',
      text: 'Buscá la segunda carta',
    });

    // Z5: la segunda carta cierra el escenario.
    game.world.setCurrentZone('Z5_Interior');
    game.player.teleport([0, 0, 9]);
    game.interaction.setCandidate('INT_note_carta_2');
    interact();
    expect(log.of('note.opened').at(-1)?.title).toBe('Segunda carta');
    interact();

    expect(game.state.phase).toBe('finished');
    expect(log.of('objective.completed')).toEqual([
      { id: 'obj_leer_carta' },
      { id: 'obj_forzar_sacristia' },
      { id: 'obj_leer_carta_2' },
    ]);
    expect(log.of('scenario.finished')).toEqual([
      { summary: { timeMs: Math.round((steps * 1000) / 60), notesFound: 2, notesTotal: 2 } },
    ]);
    expect(log.of('debug.warn')).toEqual([]);

    // Los checkpoints se persistieron en orden; `save()` espera la cola y vuelve a guardar el último.
    await game.save();
    expect(
      adapters.storage.saves.map((save) => (save.data as { checkpointId: string }).checkpointId),
    ).toEqual(['CHK_4a', 'CHK_4c', 'CHK_4c']);
  });
});
