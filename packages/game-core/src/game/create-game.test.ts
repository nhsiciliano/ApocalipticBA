import { describe, expect, it } from 'vitest';

import { createGame } from './create-game';
import { DEFAULT_GAME_SETTINGS } from './settings';
import { createNullAdapters } from '../adapters/null-adapters';
import { createSeededRng } from '../adapters/rng';
import { createTestGame, minimalScenario, scenarioWith } from '../test-utils/fixtures';

describe('createGame', () => {
  it('exposes a read-only state view with sane defaults', () => {
    const game = createGame({
      scenario: minimalScenario(),
      adapters: createNullAdapters(),
      rng: createSeededRng(3),
    });
    const { state } = game;
    expect(state.objective).toEqual({ id: 'obj_leer_carta', text: 'Leé la carta de tu papá' });
    expect(state.health).toBe(100);
    expect(state.maxHealth).toBe(100);
    expect(state.inventory.size).toBe(0);
    expect(state.flags.size).toBe(0);
    expect(state.checkpointId).toBeNull();
    expect(state.zone).toBe('Z1_Hall');
    expect(state.phase).toBe('playing');
    expect(state.flashlight).toBe(false);
    expect(state.elapsedMs).toBe(0);
    expect(game.player.position).toEqual([0, 0, 0]);
    expect(game.interaction.current).toBeNull();
    expect(DEFAULT_GAME_SETTINGS.walkSpeed).toBe(4);
  });

  it('works without optional haptics and audio adapters', () => {
    const { input, storage } = createNullAdapters();
    const game = createGame({ scenario: minimalScenario(), adapters: { input, storage } });
    game.world.registerZoneNodes('Z4_Lateral', [
      {
        id: 'TRG_esquina_4a',
        kind: 'trigger',
        position: [0, 0, 0],
        aabb: { min: [-1, 0, -1], max: [1, 2, 1] },
      },
    ]);
    game.step(1 / 60);
    expect(game.state.checkpointId).toBe('CHK_4a');
    game.player.damage(30);
    game.player.damage(100);
    expect(game.state.phase).toBe('dead');
  });

  it('counts elapsed time from steps only', () => {
    const t = createTestGame();
    t.run(90);
    expect(t.game.state.elapsedMs).toBeCloseTo(1500, 6);
  });

  it('rejects invalid dt and use after dispose', async () => {
    const t = createTestGame();
    expect(() => {
      t.game.step(0);
    }).toThrow(RangeError);
    expect(() => {
      t.game.step(Number.NaN);
    }).toThrow(RangeError);
    t.game.dispose();
    t.game.dispose();
    expect(() => {
      t.game.step(1 / 60);
    }).toThrow(/disposed/);
    expect(() => {
      t.game.world.registerZoneNodes('Z1_Hall', []);
    }).toThrow(/disposed/);
    await expect(t.game.load()).rejects.toThrow(/disposed/);
  });

  it('resolves texts in English with fallback to es-AR', () => {
    const scenario = scenarioWith([
      ['objectives', 0, 'text'],
      { 'es-AR': 'Leé la carta de tu papá', en: "Read your dad's letter" },
    ]);
    const en = createTestGame({ scenario, settings: { locale: 'en' } });
    expect(en.game.state.objective?.text).toBe("Read your dad's letter");
    en.game.interaction.setCandidate('INT_note_carta_1');
    expect(en.log.of('interact.prompt')).toEqual([
      { id: 'INT_note_carta_1', prompt: 'Leer', kind: 'note' },
    ]);
  });

  it('the flashlight toggles only with a linterna in the inventory', () => {
    const scenario = scenarioWith([
      ['pickups', 2],
      { id: 'PICK_linterna_1', zone: 'Z1_Hall', item: 'linterna' },
    ]);
    const t = createTestGame({ scenario });
    t.adapters.input.press('flashlightToggle');
    t.run();
    expect(t.game.state.flashlight).toBe(false);

    t.game.player.teleport([94, 0, 0]);
    t.run();
    expect(t.game.state.inventory.get('linterna')).toBe(1);
    t.adapters.input.press('flashlightToggle');
    t.run();
    expect(t.game.state.flashlight).toBe(true);
    t.adapters.input.press('flashlightToggle');
    t.run();
    expect(t.game.state.flashlight).toBe(false);
    expect(t.log.of('flashlight.changed')).toEqual([{ on: true }, { on: false }]);
  });

  it('is deterministic: same inputs produce the same event stream', () => {
    const play = () => {
      const t = createTestGame();
      t.adapters.input.set({ moveY: 1, lookDeltaX: 0.01 });
      t.run(120);
      t.adapters.input.set({ moveX: -1, run: true });
      t.adapters.input.press('jump');
      t.run(120);
      return { events: t.log.all, position: t.game.player.position, yaw: t.game.player.yaw };
    };
    expect(play()).toEqual(play());
  });
});
