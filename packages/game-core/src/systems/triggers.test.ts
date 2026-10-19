import { describe, expect, it } from 'vitest';

import { createTestGame, scenarioWith } from '../test-utils/fixtures.ts';

const INSIDE_4A = [0, 0, -20] as const;
const OUTSIDE = [0, 0, -10] as const;
const INSIDE_ONEWAY = [0, 4, 2] as const;

describe('triggers', () => {
  it('fires once on enter and runs its actions in order', () => {
    const t = createTestGame();
    t.game.player.teleport(INSIDE_4A);
    t.run();

    expect(t.log.of('trigger.fired')).toEqual([{ id: 'TRG_esquina_4a' }]);
    expect(t.log.all.map((event) => event.type)).toEqual([
      'trigger.fired',
      'checkpoint.saved',
      'encounter.start',
      'audio.play',
      'text.show',
    ]);
    expect(t.log.of('text.show')).toEqual([{ text: 'Algo viene corriendo.', durationMs: 3000 }]);
    expect(t.log.of('audio.play')).toEqual([{ cueId: 'sfx_corredor_grito', loop: false }]);
    expect(t.adapters.audio.calls).toEqual([
      { op: 'play', cueId: 'sfx_corredor_grito', loop: false },
    ]);
  });

  it('does not re-fire while staying inside, nor after re-entering a once trigger', () => {
    const t = createTestGame();
    t.game.player.teleport(INSIDE_4A);
    t.run(30);
    t.game.player.teleport(OUTSIDE);
    t.run();
    t.game.player.teleport(INSIDE_4A);
    t.run(5);
    expect(t.log.of('trigger.fired')).toHaveLength(1);
  });

  it('fires when the player walks into the volume', () => {
    const t = createTestGame();
    t.game.player.teleport([0, 0, -15]);
    t.adapters.input.set({ moveY: 1 });
    t.run(30);
    expect(t.log.of('trigger.fired')).toHaveLength(0);
    t.run(20);
    expect(t.log.of('trigger.fired')).toHaveLength(1);
  });

  it('once:false triggers re-fire after leaving and entering again', () => {
    const scenario = scenarioWith(
      [['triggers', 0, 'once'], false],
      [
        ['triggers', 0, 'actions'],
        [{ type: 'text.show', text: { 'es-AR': 'Hola' }, durationMs: 1 }],
      ],
    );
    const t = createTestGame({ scenario });
    t.game.player.teleport(INSIDE_4A);
    t.run(3);
    t.game.player.teleport(OUTSIDE);
    t.run();
    t.game.player.teleport(INSIDE_4A);
    t.run(3);
    expect(t.log.of('trigger.fired')).toHaveLength(2);
    expect(t.log.of('text.show')).toHaveLength(2);
  });

  it('requiresFlags blocks the trigger until the flag is set, even while staying inside', () => {
    const scenario = scenarioWith([
      ['triggers', 1],
      {
        id: 'TRG_contrafuerte',
        zone: 'Z4_Lateral',
        requiresFlags: ['enc_4a_cleared'],
        actions: [{ type: 'text.show', text: { 'es-AR': 'Despejado' }, durationMs: 1000 }],
      },
    ]);
    const t = createTestGame({ scenario });
    t.game.player.teleport(INSIDE_4A);
    t.run();
    expect(t.log.of('encounter.start')).toEqual([{ id: 'enc_4a' }]);

    t.game.player.teleport([0, 0, -30]);
    t.run(10);
    expect(t.log.of('trigger.fired')).toEqual([{ id: 'TRG_esquina_4a' }]);

    t.game.world.debugEndEncounter('enc_4a');
    expect(t.log.of('encounter.end')).toEqual([{ id: 'enc_4a' }]);
    expect(t.log.of('flag.changed')).toEqual([{ flag: 'enc_4a_cleared', value: true }]);
    expect(t.game.state.flags.has('enc_4a_cleared')).toBe(true);

    t.run();
    expect(t.log.of('trigger.fired')).toEqual([
      { id: 'TRG_esquina_4a' },
      { id: 'TRG_contrafuerte' },
    ]);
  });

  it('runs zone.unload, flag.set and objective.advance actions', () => {
    const scenario = scenarioWith([
      ['triggers', 0, 'actions'],
      [
        { type: 'zone.unload', zones: ['Z1_Hall'] },
        { type: 'flag.set', flag: 'visto', value: true },
        { type: 'flag.set', flag: 'visto', value: true },
        { type: 'flag.set', flag: 'visto', value: false },
        { type: 'objective.advance', objectiveId: 'obj_leer_carta' },
      ],
    ]);
    const t = createTestGame({ scenario });
    t.game.player.teleport(INSIDE_4A);
    t.run();
    expect(t.log.of('zone.unload')).toEqual([{ zones: ['Z1_Hall'] }]);
    expect(t.game.world.loadedZones.has('Z1_Hall')).toBe(false);
    expect(t.log.of('flag.changed')).toEqual([
      { flag: 'visto', value: true },
      { flag: 'visto', value: false },
    ]);
    expect(t.log.of('objective.completed')).toEqual([{ id: 'obj_leer_carta' }]);
    // Una descarga por acción no retira la zona: puede volver a registrarse.
    t.game.world.registerZoneNodes('Z1_Hall', []);
    expect(t.game.world.loadedZones.has('Z1_Hall')).toBe(true);
  });

  it('only evaluates triggers of registered zones', () => {
    const t = createTestGame({ zones: ['Z1_Hall'] });
    t.game.player.teleport(INSIDE_4A);
    t.run();
    expect(t.log.of('trigger.fired')).toHaveLength(0);
  });

  it('warns about encounters started twice or ended while inactive', () => {
    const t = createTestGame();
    t.game.world.debugEndEncounter('enc_4a');
    expect(t.log.of('debug.warn')).toHaveLength(1);

    const scenario = scenarioWith([['triggers', 0, 'once'], false]);
    const again = createTestGame({ scenario });
    again.game.player.teleport(INSIDE_4A);
    again.run();
    again.game.player.teleport(OUTSIDE);
    again.run();
    again.game.player.teleport(INSIDE_4A);
    again.run();
    expect(again.log.of('encounter.start')).toHaveLength(1);
    expect(again.log.of('debug.warn')).toEqual([
      { message: 'Encounter "enc_4a" is already active' },
    ]);
  });
});

describe('oneways', () => {
  it('crossing unloads the previous zones, unregisters them and is irreversible', () => {
    const t = createTestGame();
    expect(t.game.world.loadedZones.has('Z2_Plaza')).toBe(true);
    t.game.player.teleport(INSIDE_ONEWAY);
    t.run();

    expect(t.log.of('oneway.crossed')).toEqual([
      { id: 'COL_oneway_andamio', unloadZones: ['Z2_Plaza', 'Z3_Frente'] },
    ]);
    expect(t.log.of('zone.unload')).toEqual([{ zones: ['Z2_Plaza', 'Z3_Frente'] }]);
    expect(t.game.world.loadedZones.has('Z2_Plaza')).toBe(false);
    expect(t.game.world.loadedZones.has('Z3_Frente')).toBe(false);
    expect(t.game.world.loadedZones.has('Z4_Lateral')).toBe(true);
    expect(t.game.world.resolved.has('COL_oneway_andamio')).toBe(true);

    t.game.player.teleport([0, 0, -5]);
    t.run();
    t.game.player.teleport(INSIDE_ONEWAY);
    t.run();
    expect(t.log.of('oneway.crossed')).toHaveLength(1);

    t.game.world.registerZoneNodes('Z3_Frente', []);
    expect(t.game.world.loadedZones.has('Z3_Frente')).toBe(false);
    expect(t.log.of('debug.warn').at(-1)?.message).toMatch(/cannot return/);

    t.game.world.setCurrentZone('Z1_Hall');
    t.game.world.setCurrentZone('Z2_Plaza');
    expect(t.log.of('zone.preload')).toEqual([]);
  });

  it('entities of unloaded zones stop participating (interaction candidate in Z3)', () => {
    const t = createTestGame();
    t.game.player.teleport([50, 0, 1]);
    t.game.interaction.setCandidate('INT_locked_reja');
    expect(t.game.interaction.current?.id).toBe('INT_locked_reja');
    t.game.world.unregisterZone('Z3_Frente');
    t.run();
    expect(t.game.interaction.current).toBeNull();
    expect(t.log.of('interact.prompt').at(-1)).toBeNull();
  });
});
