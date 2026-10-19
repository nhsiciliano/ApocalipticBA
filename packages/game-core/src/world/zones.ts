import { ZONE_IDS, type ZoneId } from '@apocalipticba/shared';

import {
  DEFAULT_NODE_RADIUS,
  expectedNodesForZone,
  sceneNodeKindForId,
  type SceneNode,
} from './scene-nodes.ts';
import type { Entity } from '../ecs/world.ts';
import type { GameContext } from '../game/context.ts';

function lookup<T>(map: ReadonlyMap<string, T>, id: string): T {
  const value = map.get(id);
  if (value === undefined) throw new Error(`Scenario has no definition for node "${id}"`);
  return value;
}

function assertZone(ctx: GameContext, zone: ZoneId): void {
  if (!ctx.index.zones.has(zone)) {
    throw new Error(
      `Zone "${String(zone)}" is not part of scenario "${ctx.scenario.id}" (expected one of ${ZONE_IDS.join(', ')})`,
    );
  }
}

/**
 * Registra los nodos de gameplay de una zona recién cargada. Valida todo antes de tocar el estado:
 * un id que el escenario no declara para esa zona, un id repetido o un `kind` que no coincide con el
 * prefijo lanzan un `Error` que nombra el nodo. Los nodos esperados que faltan se avisan por
 * `debug.warn` (un blockout incompleto no debe frenar el juego). Volver a registrar una zona
 * reemplaza sus nodos.
 */
export function registerZoneNodes(
  ctx: GameContext,
  zone: ZoneId,
  nodes: readonly SceneNode[],
): void {
  assertZone(ctx, zone);
  if (ctx.run.retiredZones.has(zone)) {
    ctx.warn(
      `registerZoneNodes(${zone}) ignored: the zone was unloaded by a one-way and cannot return`,
    );
    return;
  }

  const expected = expectedNodesForZone(ctx.scenario, zone);
  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.id)) throw new Error(`Duplicate scene node "${node.id}" in zone ${zone}`);
    seen.add(node.id);
    if (!expected.has(node.id)) {
      throw new Error(
        `Scene node "${node.id}" is not declared for zone ${zone} in scenario "${ctx.scenario.id}"`,
      );
    }
    const kind = sceneNodeKindForId(node.id);
    if (kind !== node.kind) {
      throw new Error(
        `Scene node "${node.id}" was registered as "${node.kind}" but its prefix means "${String(kind)}"`,
      );
    }
  }
  const missing = [...expected].filter((id) => !seen.has(id));
  if (missing.length > 0) {
    ctx.warn(`Zone ${zone} registered without nodes: ${missing.join(', ')}`);
  }

  if (ctx.run.loadedZones.has(zone)) unregisterZone(ctx, zone);

  const entities = nodes.map((node) => ctx.ecs.world.add(createNodeEntity(ctx, zone, node)));
  ctx.run.zoneEntities.set(zone, entities);
  ctx.run.loadedZones.add(zone);
}

function createNodeEntity(ctx: GameContext, zone: ZoneId, node: SceneNode): Entity {
  const base: Entity = { node: { id: node.id, zone, position: node.position } };
  switch (node.kind) {
    case 'trigger':
      return {
        ...base,
        triggerVolume: {
          aabb: node.aabb,
          def: lookup(ctx.index.triggers, node.id),
          inside: false,
          firedWhileInside: false,
        },
      };
    case 'oneway':
      return {
        ...base,
        onewayVolume: { aabb: node.aabb, def: lookup(ctx.index.oneways, node.id) },
      };
    case 'spawn':
      if (node.id === ctx.scenario.start.spawnId) placeAtStart(ctx, node.position, node.yaw ?? 0);
      return { ...base, spawn: { yaw: node.yaw ?? 0 } };
    case 'checkpoint':
      return {
        ...base,
        checkpoint: { yaw: node.yaw ?? 0, def: lookup(ctx.index.checkpoints, node.id) },
      };
    case 'marker':
      return { ...base, marker: true };
    case 'pickup':
      return {
        ...base,
        pickup: {
          radius: node.radius ?? DEFAULT_NODE_RADIUS,
          def: lookup(ctx.index.pickups, node.id),
        },
      };
    case 'interactable':
      return {
        ...base,
        interactable: {
          radius: node.radius ?? DEFAULT_NODE_RADIUS,
          def: lookup(ctx.index.interactables, node.id),
        },
      };
  }
}

/** El spawn del jugador fija el piso del modo sin colisión y, la primera vez, la posición inicial. */
function placeAtStart(ctx: GameContext, position: SceneNode['position'], yaw: number): void {
  ctx.run.groundY = position[1];
  if (ctx.run.placed) return;
  ctx.run.placed = true;
  ctx.player.transform = { position, yaw, pitch: 0 };
  ctx.player.body.grounded = true;
}

/** Quita del ECS los nodos de la zona. Idempotente. El estado persistente (consumidos) se conserva. */
export function unregisterZone(ctx: GameContext, zone: ZoneId): void {
  const entities = ctx.run.zoneEntities.get(zone);
  if (entities !== undefined) {
    for (const entity of entities) ctx.ecs.world.remove(entity);
  }
  ctx.run.zoneEntities.delete(zone);
  ctx.run.loadedZones.delete(zone);
}

export function setCurrentZone(ctx: GameContext, zone: ZoneId): void {
  assertZone(ctx, zone);
  const from = ctx.run.zone;
  if (from === zone) return;
  ctx.run.zone = zone;
  ctx.events.emit('zone.changed', { from, to: zone });
  const preload = ctx.index.zones.get(zone)?.preload ?? [];
  requestPreload(ctx, preload);
}

/** Pide al host precargar zonas; filtra las ya cargadas y las retiradas por un oneway. */
export function requestPreload(ctx: GameContext, zones: readonly ZoneId[]): void {
  const pending = zones.filter(
    (zone) => !ctx.run.loadedZones.has(zone) && !ctx.run.retiredZones.has(zone),
  );
  if (pending.length > 0) ctx.events.emit('zone.preload', { zones: pending });
}

/**
 * Pide al host descargar zonas y las desregistra. Con `retire` (oneways) quedan marcadas para no
 * volver a cargarse.
 */
export function unloadZones(ctx: GameContext, zones: readonly ZoneId[], retire: boolean): void {
  if (zones.length === 0) return;
  ctx.events.emit('zone.unload', { zones: [...zones] });
  for (const zone of zones) {
    unregisterZone(ctx, zone);
    if (retire) ctx.run.retiredZones.add(zone);
  }
}
