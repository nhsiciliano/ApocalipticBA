import type { CheckpointId, ZoneId } from '@apocalipticba/shared';

import { currentObjective } from './objectives';
import { setPhase, type GameContext } from '../game/context';
import type { CheckpointSnapshot, RestorePoint } from '../game/snapshot';
import { aabbIntersectsVerticalSegment } from '../math/aabb';
import { ZERO } from '../math/vec3';
import { requestPreload, unloadZones } from '../world/zones';

export function saveKey(ctx: GameContext): string {
  return `save:${ctx.scenario.id}`;
}

export function takeSnapshot(ctx: GameContext, checkpointId: CheckpointId): CheckpointSnapshot {
  const { run, player } = ctx;
  return {
    version: 1,
    scenarioId: ctx.scenario.id,
    checkpointId,
    position: player.transform.position,
    yaw: player.transform.yaw,
    health: player.health.current,
    inventory: [...run.inventory],
    flags: [...run.flags],
    objectiveIndex: run.objectiveIndex,
    consumedPickups: [...run.consumedPickups],
    crossedOneways: [...run.crossedOneways],
    openedGates: [...run.openedGates],
    completedHolds: [...run.completedHolds],
    firedTriggers: [...run.firedTriggers],
    notesFound: [...run.notesFound],
    elapsedMs: run.elapsedMs,
  };
}

/** Encola una escritura al storage; las escrituras se serializan y un error va a `debug.warn`. */
export function persist(ctx: GameContext, snapshot: CheckpointSnapshot): Promise<void> {
  const key = saveKey(ctx);
  ctx.run.persistQueue = ctx.run.persistQueue
    .then(() => ctx.storage.save(key, snapshot))
    .catch((error: unknown) => {
      ctx.warn(`Saving ${key} failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  return ctx.run.persistQueue;
}

/**
 * Acción `checkpoint.save`: toma el snapshot en el acto (determinista) y lo persiste en segundo
 * plano. `checkpoint.saved` se emite al tomar el snapshot, no al terminar de escribir.
 */
export function saveCheckpoint(ctx: GameContext, checkpointId: CheckpointId): void {
  const snapshot = takeSnapshot(ctx, checkpointId);
  ctx.run.lastSnapshot = snapshot;
  ctx.run.checkpointId = checkpointId;
  ctx.events.emit('checkpoint.saved', { id: checkpointId });
  void persist(ctx, snapshot);
}

/**
 * Restaura un punto de reaparición. La posición sale del nodo `CHK_` registrado (o del spawn si es
 * el inicio); si la zona no está cargada se usa la guardada. Vida al máximo, fase `playing`.
 * `restoreTime` solo es true al cargar desde storage: al reaparecer el reloj sigue corriendo.
 */
export function restore(ctx: GameContext, point: RestorePoint, restoreTime: boolean): void {
  const { run, player } = ctx;

  run.flags = new Set(point.flags);
  run.inventory = new Map(point.inventory);
  run.objectiveIndex = point.objectiveIndex;
  run.consumedPickups = new Set(point.consumedPickups);
  run.crossedOneways = new Set(point.crossedOneways);
  run.openedGates = new Set(point.openedGates);
  run.completedHolds = new Set(point.completedHolds);
  run.firedTriggers = new Set(point.firedTriggers);
  run.notesFound = new Set(point.notesFound);
  run.holds = new Map(point.completedHolds.map((id) => [id, { progress: 1, started: true }]));
  run.activeEncounters.clear();
  run.openNote = null;
  run.climb = null;
  run.flashlight = false;
  run.checkpointId = point.checkpointId;
  run.lastSnapshot = point.checkpointId === null ? null : point;
  if (restoreTime) run.elapsedMs = point.elapsedMs;

  const anchor = findAnchor(ctx, point.checkpointId);
  player.transform = {
    position: anchor?.position ?? point.position,
    yaw: anchor?.yaw ?? point.yaw,
    pitch: 0,
  };
  player.velocity.value = ZERO;
  player.body.crouching = false;
  player.body.desiredDelta = ZERO;
  player.body.grounded = run.hostResolvesCollisions
    ? false
    : player.transform.position[1] <= run.groundY;
  player.health.current = player.health.max;
  run.placed = true;

  // Las zonas retiradas son las de los oneways cruzados según el punto restaurado.
  const retired = new Set<ZoneId>();
  for (const id of run.crossedOneways) {
    for (const unload of ctx.index.oneways.get(id)?.unloadZones ?? []) retired.add(unload);
  }
  unloadZones(
    ctx,
    [...retired].filter((zone) => run.loadedZones.has(zone)),
    false,
  );
  // Si se reaparece antes de un oneway, sus zonas vuelven: se piden de nuevo al host.
  const returning = [...run.retiredZones].filter((zone) => !retired.has(zone));
  run.retiredZones = retired;

  const zone =
    point.checkpointId === null
      ? ctx.scenario.start.zone
      : (ctx.index.checkpoints.get(point.checkpointId)?.zone ?? run.zone);
  if (zone !== run.zone) {
    ctx.events.emit('zone.changed', { from: run.zone, to: zone });
    run.zone = zone;
  }
  requestPreload(ctx, [zone, ...(ctx.index.zones.get(zone)?.preload ?? []), ...returning]);

  syncVolumes(ctx);

  setPhase(ctx, 'playing');
  ctx.events.emit('checkpoint.restored', { id: point.checkpointId });
  ctx.events.emit('player.health', { health: player.health.current, maxHealth: player.health.max });
  const objective = currentObjective(ctx);
  if (objective !== null) ctx.events.emit('objective.changed', objective);
}

function findAnchor(
  ctx: GameContext,
  checkpointId: CheckpointId | null,
): { position: RestorePoint['position']; yaw: number } | undefined {
  if (checkpointId === null) {
    for (const entity of ctx.ecs.spawns) {
      if (entity.node.id === ctx.scenario.start.spawnId) {
        return { position: entity.node.position, yaw: entity.spawn.yaw };
      }
    }
    return undefined;
  }
  for (const entity of ctx.ecs.checkpoints) {
    if (entity.node.id === checkpointId) {
      return { position: entity.node.position, yaw: entity.checkpoint.yaw };
    }
  }
  return undefined;
}

/** Recalcula quién está dentro de cada trigger sin disparar nada (tras teleport o restore). */
export function syncVolumes(ctx: GameContext): void {
  const height = ctx.player.body.crouching ? ctx.settings.crouchHeight : ctx.settings.playerHeight;
  for (const entity of ctx.ecs.triggers) {
    const inside = aabbIntersectsVerticalSegment(
      entity.triggerVolume.aabb,
      ctx.player.transform.position,
      height,
    );
    entity.triggerVolume.inside = inside;
    entity.triggerVolume.firedWhileInside = inside;
  }
}
