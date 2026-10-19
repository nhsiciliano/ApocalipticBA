import { describe, expect, it } from 'vitest';

import { createTestGame, DT, scenarioWith } from '../test-utils/fixtures.ts';

const NEAR_NOTE = [100, 0, 0] as const;
const NEAR_GATE = [100, 0, -9] as const;
const NEAR_HOLD = [0, 0, 3] as const;
const CLIMB_BASE = [0, 0, 0] as const;

describe('interaction candidate', () => {
  it('emits a prompt only when the validated candidate changes', () => {
    const t = createTestGame();
    t.game.interaction.setCandidate('INT_note_carta_1');
    t.game.interaction.setCandidate('INT_note_carta_1');
    t.run(3);
    expect(t.log.of('interact.prompt')).toEqual([
      { id: 'INT_note_carta_1', prompt: 'Leer', kind: 'note' },
    ]);
    expect(t.game.interaction.current).toEqual({
      id: 'INT_note_carta_1',
      kind: 'note',
      progress: 0,
    });
    t.game.interaction.setCandidate(null);
    expect(t.log.of('interact.prompt').at(-1)).toBeNull();
  });

  it('rejects candidates out of range and picks them up when the player walks closer', () => {
    const t = createTestGame();
    t.game.player.teleport([100, 0, 5]);
    t.game.interaction.setCandidate('INT_note_carta_1');
    t.run();
    expect(t.log.of('interact.prompt')).toEqual([]);
    expect(t.game.interaction.current).toBeNull();

    t.adapters.input.press('interact');
    t.run();
    expect(t.game.state.phase).toBe('playing');

    t.adapters.input.set({ moveY: 1 });
    t.run(90);
    expect(t.log.of('interact.prompt')).toEqual([
      { id: 'INT_note_carta_1', prompt: 'Leer', kind: 'note' },
    ]);
  });

  it('warns about unknown ids and ignores unregistered interactables', () => {
    const t = createTestGame({ zones: ['Z4_Lateral'] });
    t.game.interaction.setCandidate('INT_nope');
    expect(t.log.of('debug.warn')).toHaveLength(1);
    t.game.player.teleport([100, 0, 0]);
    t.game.interaction.setCandidate('INT_note_carta_1');
    expect(t.game.interaction.current).toBeNull();
  });
});

describe('notes', () => {
  it('opens with interact, closes with interact, records the note and runs onRead once', () => {
    const t = createTestGame();
    t.game.player.teleport(NEAR_NOTE);
    t.game.interaction.setCandidate('INT_note_carta_1');
    t.adapters.input.press('interact');
    t.run();

    expect(t.game.state.phase).toBe('reading_note');
    const [opened] = t.log.of('note.opened');
    expect(opened?.noteId).toBe('note_carta_1');
    expect(opened?.title).toBe('Primera carta');
    expect(opened?.body).toMatch(/^Te golpeaste fuerte la cabeza/);
    expect(t.log.of('audio.play')).toEqual([{ cueId: 'vo_carta_1', loop: false }]);
    expect(t.log.of('player.phase')).toEqual([{ phase: 'reading_note' }]);
    expect(t.log.of('interact.prompt').at(-1)).toBeNull();

    t.run(10);
    t.adapters.input.press('interact');
    t.run();
    expect(t.game.state.phase).toBe('playing');
    expect(t.log.of('note.closed')).toEqual([{ noteId: 'note_carta_1' }]);
    expect(t.adapters.audio.calls.at(-1)).toEqual({ op: 'stop', cueId: 'vo_carta_1' });
    expect(t.game.state.notesFound.has('note_carta_1')).toBe(true);
    expect(t.log.of('objective.completed')).toEqual([{ id: 'obj_leer_carta' }]);
    expect(t.log.of('interact.prompt').at(-1)).toEqual({
      id: 'INT_note_carta_1',
      prompt: 'Leer',
      kind: 'note',
    });

    // Releer no repite onRead (ni avisa por objetivo fuera de orden).
    t.adapters.input.press('interact');
    t.run();
    t.game.interaction.closeNote();
    expect(t.log.of('note.opened')).toHaveLength(2);
    expect(t.log.of('objective.completed')).toHaveLength(1);
    expect(t.log.of('debug.warn')).toHaveLength(0);
  });

  it('closeNote is a no-op when no note is open', () => {
    const t = createTestGame();
    t.game.interaction.closeNote();
    expect(t.log.all).toEqual([]);
  });
});

describe('locked and gate', () => {
  it('locked interactables emit their message', () => {
    const t = createTestGame();
    t.game.player.teleport([50, 0, 1]);
    t.game.interaction.setCandidate('INT_locked_reja');
    t.adapters.input.press('interact');
    t.run();
    expect(t.log.of('interact.locked')).toEqual([
      { id: 'INT_locked_reja', message: 'Está cerrada. Tiene que haber otra entrada.' },
    ]);
    expect(t.adapters.haptics.calls).toEqual(['warning']);
    expect(t.game.interaction.current?.id).toBe('INT_locked_reja');
  });

  it('gate stays locked without every required item and opens with them', () => {
    const t = createTestGame({ zones: ['Z1_Hall'] });
    t.game.player.teleport([103, 0, 0]);
    t.run();
    t.game.player.teleport(NEAR_GATE);
    t.game.interaction.setCandidate('INT_gate_salida_hall');
    t.adapters.input.press('interact');
    t.run();
    expect(t.log.of('interact.locked')).toEqual([
      { id: 'INT_gate_salida_hall', message: 'Necesitás las dos armas antes de salir.' },
    ]);
    expect(t.game.world.resolved.has('INT_gate_salida_hall')).toBe(false);

    t.game.player.teleport([97, 0, 0]);
    t.run();
    t.game.player.teleport(NEAR_GATE);
    t.run();
    t.adapters.input.press('interact');
    t.run();
    expect(t.log.of('interact.completed')).toEqual([{ id: 'INT_gate_salida_hall' }]);
    expect(t.log.of('zone.preload')).toEqual([{ zones: ['Z2_Plaza'] }]);
    expect(t.game.world.resolved.has('INT_gate_salida_hall')).toBe(true);
    expect(t.game.interaction.current).toBeNull();
    expect(t.log.of('interact.prompt').at(-1)).toBeNull();
  });
});

describe('hold', () => {
  const advanceToHold = (t: ReturnType<typeof createTestGame>) => {
    // obj_forzar_sacristia es el segundo objetivo: primero se lee la carta.
    t.game.player.teleport(NEAR_NOTE);
    t.game.interaction.setCandidate('INT_note_carta_1');
    t.adapters.input.press('interact');
    t.run();
    t.game.interaction.closeNote();
    t.game.player.teleport(NEAR_HOLD);
    t.game.interaction.setCandidate('INT_hold_sacristia');
    t.log.clear();
  };

  it('accumulates while held, keeps progress on release and completes once', () => {
    const t = createTestGame();
    advanceToHold(t);
    t.adapters.input.set({ interactHeld: true });
    t.run(180);
    expect(t.game.interaction.current?.progress).toBeCloseTo(0.5, 9);
    expect(t.log.of('audio.play')).toEqual([{ cueId: 'sfx_forzar_puerta', loop: true }]);

    t.adapters.input.set({ interactHeld: false });
    t.run(60);
    expect(t.game.interaction.current?.progress).toBeCloseTo(0.5, 9);

    t.adapters.input.set({ interactHeld: true });
    t.run(179);
    expect(t.log.of('interact.completed')).toEqual([]);
    t.run();
    expect(t.log.of('interact.completed')).toEqual([{ id: 'INT_hold_sacristia' }]);
    t.run(30);

    const progress = t.log.of('interact.progress').map((event) => event.progress);
    expect(progress).toHaveLength(360);
    expect(progress.every((value, i) => i === 0 || value > (progress[i - 1] ?? 0))).toBe(true);
    expect(progress.at(-1)).toBe(1);
    expect(t.log.of('audio.play')).toHaveLength(1);
    expect(t.log.of('interact.completed')).toHaveLength(1);
    expect(t.log.of('objective.completed')).toEqual([{ id: 'obj_forzar_sacristia' }]);
    expect(t.adapters.audio.calls.filter((call) => call.op === 'stop').at(-1)).toEqual({
      op: 'stop',
      cueId: 'sfx_forzar_puerta',
    });
    expect(t.game.world.resolved.has('INT_hold_sacristia')).toBe(true);
    expect(t.game.interaction.current).toBeNull();
  });

  it('completes after exactly durationMs of holding', () => {
    const t = createTestGame();
    advanceToHold(t);
    t.adapters.input.set({ interactHeld: true });
    t.run(359);
    expect(t.game.interaction.current?.progress).toBeLessThan(1);
    t.run();
    expect(t.log.of('interact.completed')).toHaveLength(1);
    expect(359 * DT * 1000).toBeLessThan(6000);
  });

  it('non-accumulative holds reset when released or when the candidate changes', () => {
    const scenario = scenarioWith([['interactables', 2, 'accumulative'], false]);
    const t = createTestGame({ scenario });
    t.game.player.teleport(NEAR_HOLD);
    t.game.interaction.setCandidate('INT_hold_sacristia');
    t.adapters.input.set({ interactHeld: true });
    t.run(60);
    expect(t.game.interaction.current?.progress).toBeCloseTo(1 / 6, 9);

    t.adapters.input.set({ interactHeld: false });
    t.run();
    expect(t.game.interaction.current?.progress).toBe(0);
    expect(t.log.of('interact.progress').at(-1)).toEqual({ id: 'INT_hold_sacristia', progress: 0 });

    t.adapters.input.set({ interactHeld: true });
    t.run(60);
    t.game.interaction.setCandidate(null);
    t.run();
    t.game.interaction.setCandidate('INT_hold_sacristia');
    expect(t.game.interaction.current?.progress).toBe(0);
    // onStart corre una sola vez aunque se reinicie el progreso.
    expect(t.log.of('audio.play')).toHaveLength(1);
  });
});

describe('climb', () => {
  it('moves along the path in exactly durationMs and ends on the last point', () => {
    const t = createTestGame();
    t.game.player.teleport([0, 0, -0.5]);
    t.game.interaction.setCandidate('INT_climb_andamio');
    t.adapters.input.press('interact');
    t.run();
    expect(t.game.state.phase).toBe('climbing');
    expect(t.log.of('player.phase')).toEqual([{ phase: 'climbing' }]);
    expect(Math.abs(t.game.player.yaw)).toBeCloseTo(Math.PI, 9);

    const heights: number[] = [];
    for (let i = 0; i < 149; i += 1) {
      t.run();
      heights.push(t.game.player.position[1]);
    }
    expect(t.game.state.phase).toBe('climbing');
    expect(heights.every((y, i) => i === 0 || y > (heights[i - 1] ?? 0))).toBe(true);
    expect(t.log.of('interact.completed')).toEqual([]);

    t.run();
    expect(t.game.player.position).toEqual([0, 4.2, 1.8]);
    expect(t.game.state.phase).toBe('playing');
    expect(t.log.of('interact.completed')).toEqual([{ id: 'INT_climb_andamio' }]);
    expect(t.log.of('checkpoint.saved')).toEqual([{ id: 'CHK_4c' }]);
    expect(t.log.of('player.phase').at(-1)).toEqual({ phase: 'playing' });
  });

  it('interpolates proportionally to segment length', () => {
    const t = createTestGame();
    t.game.player.teleport(CLIMB_BASE);
    t.game.interaction.setCandidate('INT_climb_andamio');
    t.adapters.input.press('interact');
    t.run();
    const first = Math.hypot(2.5, 0.6);
    const second = Math.hypot(1.7, 1.2);
    // 75 pasos = mitad del tiempo = mitad de la longitud total, todavía en el primer tramo.
    t.run(75);
    const travelled = (first + second) / 2;
    const fraction = travelled / first;
    expect(t.game.player.position[1]).toBeCloseTo(2.5 * fraction, 6);
    expect(t.game.player.position[2]).toBeCloseTo(0.6 * fraction, 6);
    expect(t.game.player.desiredDelta[1]).toBeGreaterThan(0);
  });

  it('starts snapping the player to the first point of the path', () => {
    const t = createTestGame();
    t.game.player.teleport([0.5, 0, -1.5]);
    t.game.interaction.setCandidate('INT_climb_andamio');
    t.adapters.input.press('interact');
    t.run();
    expect(t.game.player.position).toEqual([0, 0, 0]);
    expect(t.game.player.desiredDelta).toEqual([-0.5, 0, 1.5]);
  });
});
