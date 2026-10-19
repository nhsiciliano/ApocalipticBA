import { collectPickup } from './inventory.ts';
import { playerHeight, type GameContext } from '../game/context.ts';
import { distanceToVerticalSegment } from '../math/vec3.ts';

/**
 * Recoge por proximidad: el pickup entra al inventario cuando el eje de la cápsula queda a menos de
 * `radius` del nodo. Los pickups que tienen un `INT_pickup_*` asociado solo se recogen interactuando.
 */
export function pickupsSystem(ctx: GameContext): void {
  if (ctx.run.phase !== 'playing' && ctx.run.phase !== 'climbing') return;
  const position = ctx.player.transform.position;
  const height = playerHeight(ctx);

  for (const entity of ctx.ecs.pickups) {
    const { def, radius } = entity.pickup;
    if (ctx.run.consumedPickups.has(def.id) || ctx.index.interactionOnlyPickups.has(def.id))
      continue;
    if (distanceToVerticalSegment(entity.node.position, position, height) <= radius) {
      collectPickup(ctx, def);
    }
  }
}
