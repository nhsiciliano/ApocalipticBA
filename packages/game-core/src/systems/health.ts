import { restore } from './checkpoints.ts';
import { setPhase, type GameContext } from '../game/context.ts';
import { ZERO } from '../math/vec3.ts';

/** Aplica daño. A 0 de vida el jugador pasa a `dead`; el host decide cuándo llamar `respawn`. */
export function damage(ctx: GameContext, amount: number): void {
  const { run, player } = ctx;
  if (run.phase === 'dead' || run.phase === 'finished') return;
  if (!(amount > 0) || !Number.isFinite(amount)) return;

  player.health.current = Math.max(0, player.health.current - amount);
  ctx.events.emit('player.health', { health: player.health.current, maxHealth: player.health.max });
  if (player.health.current > 0) {
    ctx.haptics?.impact('medium');
    return;
  }

  run.openNote = null;
  run.climb = null;
  player.velocity.value = ZERO;
  player.body.desiredDelta = ZERO;
  ctx.haptics?.impact('heavy');
  ctx.haptics?.notification('error');
  setPhase(ctx, 'dead');
  ctx.events.emit('player.died');
}

/** Reaparece en el último checkpoint (o en el inicio si no hubo ninguno). */
export function respawn(ctx: GameContext): void {
  if (ctx.run.phase === 'finished') {
    ctx.warn('respawn ignored: the scenario is finished');
    return;
  }
  const point = ctx.run.lastSnapshot ?? ctx.run.initialRestorePoint;
  restore(ctx, point, false);
  ctx.events.emit('player.respawned', { checkpointId: point.checkpointId });
}
