import type { Action, EncounterId } from '@apocalipticba/shared';

import type { GameContext } from '../game/context';
import { saveCheckpoint } from '../systems/checkpoints';
import { advanceObjective } from '../systems/objectives';
import { requestPreload, unloadZones } from '../world/zones';

/** Ejecuta en orden las acciones de un trigger, interactuable o encuentro. */
export function runActions(ctx: GameContext, actions: readonly Action[]): void {
  for (const action of actions) runAction(ctx, action);
}

function runAction(ctx: GameContext, action: Action): void {
  switch (action.type) {
    case 'objective.advance':
    case 'objective.complete':
      advanceObjective(ctx, action.objectiveId);
      break;
    case 'encounter.start':
      startEncounter(ctx, action.encounterId);
      break;
    case 'checkpoint.save':
      saveCheckpoint(ctx, action.checkpointId);
      break;
    case 'audio.play': {
      const loop = action.loop ?? false;
      ctx.audio?.play(action.cueId, { loop });
      ctx.events.emit('audio.play', { cueId: action.cueId, loop });
      break;
    }
    case 'text.show':
      ctx.events.emit('text.show', { text: ctx.text(action.text), durationMs: action.durationMs });
      break;
    case 'zone.unload':
      unloadZones(ctx, action.zones, false);
      break;
    case 'zone.preload':
      requestPreload(ctx, action.zones);
      break;
    case 'flag.set':
      setFlag(ctx, action.flag, action.value);
      break;
  }
}

export function setFlag(ctx: GameContext, flag: string, value: boolean): void {
  if (ctx.run.flags.has(flag) === value) return;
  if (value) ctx.run.flags.add(flag);
  else ctx.run.flags.delete(flag);
  ctx.events.emit('flag.changed', { flag, value });
}

/** En Fase 0 no hay spawner: el encuentro queda activo hasta `endEncounter`. */
function startEncounter(ctx: GameContext, id: EncounterId): void {
  if (ctx.run.activeEncounters.has(id)) {
    ctx.warn(`Encounter "${id}" is already active`);
    return;
  }
  ctx.run.activeEncounters.add(id);
  ctx.events.emit('encounter.start', { id });
}

/**
 * Termina un encuentro activo y ejecuta su `onEnd`. La condición `all_dead` no puede cumplirse en
 * Fase 0 (no hay zombies): la usan los tests y el host vía `world.debugEndEncounter`.
 */
export function endEncounter(ctx: GameContext, id: EncounterId): void {
  if (!ctx.run.activeEncounters.delete(id)) {
    ctx.warn(`Encounter "${id}" is not active`);
    return;
  }
  ctx.events.emit('encounter.end', { id });
  runActions(ctx, ctx.index.encounters.get(id)?.onEnd ?? []);
}
