import type { ObjectiveId } from '@apocalipticba/shared';

import { setPhase, type GameContext } from '../game/context.ts';

export function currentObjective(ctx: GameContext): { id: ObjectiveId; text: string } | null {
  const objective = ctx.scenario.objectives[ctx.run.objectiveIndex];
  return objective === undefined ? null : { id: objective.id, text: ctx.text(objective.text) };
}

/**
 * Completa el objetivo actual y pasa al siguiente. Los objetivos son secuenciales: si `id` no es el
 * actual no pasa nada (se avisa por `debug.warn`, salvo que ya estuviera completo). Al completar el
 * último, la partida termina. `objective.advance` y `objective.complete` comparten esta semántica.
 */
export function advanceObjective(ctx: GameContext, id: ObjectiveId): void {
  const objectives = ctx.scenario.objectives;
  const index = objectives.findIndex((objective) => objective.id === id);
  if (index !== ctx.run.objectiveIndex) {
    if (index === -1 || index > ctx.run.objectiveIndex) {
      const current = objectives[ctx.run.objectiveIndex]?.id ?? 'none';
      ctx.warn(`Objective "${id}" is not the current one ("${current}"); ignored`);
    }
    return;
  }

  ctx.run.objectiveIndex += 1;
  ctx.events.emit('objective.completed', { id });
  ctx.haptics?.notification('success');

  const next = currentObjective(ctx);
  if (next !== null) {
    ctx.events.emit('objective.changed', next);
  } else {
    finishScenario(ctx);
  }
}

function finishScenario(ctx: GameContext): void {
  ctx.run.openNote = null;
  ctx.run.climb = null;
  setPhase(ctx, 'finished');
  ctx.events.emit('scenario.finished', {
    summary: {
      timeMs: Math.round(ctx.run.elapsedMs),
      notesFound: ctx.run.notesFound.size,
      notesTotal: ctx.scenario.notes.length,
    },
  });
}
