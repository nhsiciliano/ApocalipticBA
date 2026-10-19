import type { Interactable } from '@apocalipticba/shared';

import { runActions } from '../actions/run-actions.ts';
import { setPhase, type GameContext } from '../game/context.ts';
import { distance, lerp, sub, yawTowards, ZERO, type Vec3 } from '../math/vec3.ts';

type ClimbDef = Extract<Interactable, { kind: 'climb' }>;

/** Tolerancia para cerrar el recorrido pese al redondeo de sumar `dt` (ms). */
const TIME_EPSILON_MS = 1e-6;

/** El esquema garantiza `path.length >= 2`; esto solo traduce el índice a un `Vec3` tipado. */
function point(path: readonly Vec3[], index: number): Vec3 {
  const value = path[index];
  if (value === undefined) throw new RangeError(`Climb path has no point ${String(index)}`);
  return value;
}

/**
 * Trepar: el jugador pasa a `climbing`, se ubica en `path[0]` y el core lo lleva por el camino a
 * velocidad constante (cada tramo dura en proporción a su longitud) durante `durationMs`.
 */
export function startClimb(ctx: GameContext, def: ClimbDef): void {
  const path = def.path;
  const cumulative = [0];
  for (let i = 1; i < path.length; i += 1) {
    cumulative.push((cumulative[i - 1] ?? 0) + distance(point(path, i - 1), point(path, i)));
  }
  ctx.run.climb = {
    id: def.id,
    path,
    cumulative,
    totalLength: cumulative.at(-1) ?? 0,
    durationMs: def.durationMs,
    elapsedMs: 0,
  };

  const { player } = ctx;
  const start = point(path, 0);
  player.body.desiredDelta = sub(start, player.transform.position);
  player.transform.position = start;
  player.transform.yaw = yawTowards(start, point(path, 1)) ?? player.transform.yaw;
  player.velocity.value = ZERO;
  player.body.crouching = false;
  setPhase(ctx, 'climbing');
}

export function updateClimb(ctx: GameContext, dt: number): void {
  const climb = ctx.run.climb;
  if (climb === null) return;
  const { player } = ctx;

  climb.elapsedMs += dt * 1000;
  const done = climb.elapsedMs >= climb.durationMs - TIME_EPSILON_MS;
  const t = done ? 1 : climb.elapsedMs / climb.durationMs;
  const travelled = t * climb.totalLength;

  let segment = 0;
  while (
    segment < climb.path.length - 2 &&
    (climb.cumulative[segment + 1] ?? Infinity) < travelled
  ) {
    segment += 1;
  }
  const from = point(climb.path, segment);
  const to = point(climb.path, segment + 1);
  const segmentStart = climb.cumulative[segment] ?? 0;
  const segmentLength = (climb.cumulative[segment + 1] ?? segmentStart) - segmentStart;
  const local = segmentLength > 0 ? (travelled - segmentStart) / segmentLength : 1;
  const position = done
    ? point(climb.path, climb.path.length - 1)
    : lerp(from, to, Math.min(1, local));

  player.body.desiredDelta = sub(position, player.transform.position);
  player.transform.position = position;
  player.transform.yaw = yawTowards(from, to) ?? player.transform.yaw;

  if (!done) return;

  const def = ctx.index.interactables.get(climb.id);
  ctx.run.climb = null;
  player.velocity.value = ZERO;
  player.body.grounded = ctx.run.hostResolvesCollisions ? false : position[1] <= ctx.run.groundY;
  setPhase(ctx, 'playing');
  ctx.events.emit('interact.completed', { id: climb.id });
  if (def?.kind === 'climb') runActions(ctx, def.onComplete);
}
