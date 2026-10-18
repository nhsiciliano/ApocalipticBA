import { describe, expect, it } from 'vitest';

import { createTestGame } from '../test-utils/fixtures';

function readFirstNote(t: ReturnType<typeof createTestGame>) {
  t.game.player.teleport([100, 0, 0]);
  t.game.interaction.setCandidate('INT_note_carta_1');
  t.adapters.input.press('interact');
  t.run();
  t.game.interaction.closeNote();
}

function forceDoor(t: ReturnType<typeof createTestGame>) {
  t.game.player.teleport([0, 0, 3]);
  t.game.interaction.setCandidate('INT_hold_sacristia');
  t.adapters.input.set({ interactHeld: true });
  t.run(360);
  t.adapters.input.set({ interactHeld: false });
}

describe('objectives', () => {
  it('starts on the first objective with its localized text', () => {
    const t = createTestGame();
    expect(t.game.state.objective).toEqual({
      id: 'obj_leer_carta',
      text: 'Leé la carta de tu papá',
    });
  });

  it('advances sequentially and announces the next objective', () => {
    const t = createTestGame();
    readFirstNote(t);
    expect(t.log.of('objective.completed')).toEqual([{ id: 'obj_leer_carta' }]);
    expect(t.log.of('objective.changed')).toEqual([
      { id: 'obj_forzar_sacristia', text: 'Forzá la puerta de la sacristía' },
    ]);
    expect(t.game.state.objective?.id).toBe('obj_forzar_sacristia');
    expect(t.adapters.haptics.calls).toContain('success');
  });

  it('ignores out-of-order advances with a debug warning', () => {
    const t = createTestGame();
    forceDoor(t);
    expect(t.log.of('interact.completed')).toEqual([{ id: 'INT_hold_sacristia' }]);
    expect(t.log.of('objective.completed')).toEqual([]);
    expect(t.log.of('debug.warn')).toEqual([
      {
        message:
          'Objective "obj_forzar_sacristia" is not the current one ("obj_leer_carta"); ignored',
      },
    ]);
    expect(t.game.state.objective?.id).toBe('obj_leer_carta');
  });

  it('completing the last objective finishes the scenario with a summary', () => {
    const t = createTestGame();
    readFirstNote(t);
    t.run(59);
    forceDoor(t);

    expect(t.game.state.phase).toBe('finished');
    expect(t.game.state.objective).toBeNull();
    expect(t.log.of('player.phase').at(-1)).toEqual({ phase: 'finished' });
    expect(t.log.of('scenario.finished')).toEqual([
      {
        summary: { timeMs: Math.round(((1 + 59 + 360) * 1000) / 60), notesFound: 1, notesTotal: 2 },
      },
    ]);

    // Terminada la partida, el reloj y el jugador quedan quietos.
    const elapsed = t.game.state.elapsedMs;
    const position = t.game.player.position;
    t.adapters.input.set({ moveY: 1 });
    t.run(30);
    expect(t.game.state.elapsedMs).toBe(elapsed);
    expect(t.game.player.position).toEqual(position);

    // Un objetivo ya completo no vuelve a avisar.
    t.game.player.damage(10);
    expect(t.log.of('player.health')).toEqual([]);
    t.game.player.respawn();
    expect(t.log.of('debug.warn').at(-1)?.message).toMatch(/finished/);
  });
});
