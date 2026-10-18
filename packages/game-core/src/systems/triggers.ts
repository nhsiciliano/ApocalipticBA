import { runActions } from '../actions/run-actions';
import { playerHeight, type GameContext } from '../game/context';
import { aabbIntersectsVerticalSegment } from '../math/aabb';
import { unloadZones } from '../world/zones';

/**
 * Triggers AABB contra el eje de la cápsula del jugador. Dispara una vez por estadía: al entrar, o
 * mientras sigue adentro si recién se cumplen sus `requiresFlags`. Salir rearma los `once: false`;
 * los `once: true` quedan consumidos (y persisten en el checkpoint).
 */
export function triggersSystem(ctx: GameContext): void {
  if (ctx.run.phase === 'dead' || ctx.run.phase === 'finished') return;
  const position = ctx.player.transform.position;
  const height = playerHeight(ctx);

  for (const entity of ctx.ecs.triggers) {
    const volume = entity.triggerVolume;
    const inside = aabbIntersectsVerticalSegment(volume.aabb, position, height);
    if (!inside) {
      volume.inside = false;
      volume.firedWhileInside = false;
      continue;
    }
    volume.inside = true;
    if (volume.firedWhileInside) continue;

    const { def } = volume;
    if (def.once && ctx.run.firedTriggers.has(def.id)) continue;
    if (def.requiresFlags?.some((flag) => !ctx.run.flags.has(flag)) === true) continue;

    volume.firedWhileInside = true;
    if (def.once) ctx.run.firedTriggers.add(def.id);
    ctx.events.emit('trigger.fired', { id: def.id });
    runActions(ctx, def.actions);
  }
}

/**
 * Bloqueos de un solo sentido: entrar al volumen `COL_oneway_<id>` lo marca cruzado (irreversible),
 * avisa al host para que active la colisión y descarga las zonas anteriores.
 */
export function onewaysSystem(ctx: GameContext): void {
  if (ctx.run.phase === 'dead' || ctx.run.phase === 'finished') return;
  const position = ctx.player.transform.position;
  const height = playerHeight(ctx);

  for (const entity of ctx.ecs.oneways) {
    const { def, aabb } = entity.onewayVolume;
    if (ctx.run.crossedOneways.has(def.id)) continue;
    if (!aabbIntersectsVerticalSegment(aabb, position, height)) continue;

    ctx.run.crossedOneways.add(def.id);
    ctx.events.emit('oneway.crossed', { id: def.id, unloadZones: [...def.unloadZones] });
    unloadZones(ctx, def.unloadZones, true);
  }
}
