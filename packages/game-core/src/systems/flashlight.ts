import { hasItem } from './inventory';
import type { PlayerIntent } from '../adapters/input';
import type { GameContext } from '../game/context';

/** La linterna solo se prende si está en el inventario. */
export function flashlightSystem(ctx: GameContext, intent: PlayerIntent): void {
  if (!intent.flashlightToggle || ctx.run.phase !== 'playing') return;
  if (!hasItem(ctx, 'linterna')) return;
  ctx.run.flashlight = !ctx.run.flashlight;
  ctx.events.emit('flashlight.changed', { on: ctx.run.flashlight });
}
