import {
  collectSceneNodeIds,
  ID_PATTERNS,
  type Scenario,
  type ZoneId,
} from '@apocalipticba/shared';

import type { Aabb } from '../math/aabb.ts';
import type { Vec3 } from '../math/vec3.ts';

/**
 * Nodo de gameplay leído del glTF de una zona. El host solo pasa nodos con prefijo de gameplay
 * (`TRG_`, `COL_oneway_`, `SPAWN_`, `CHK_`, `MRK_`, `PICK_`, `INT_`); el resto (`COL_`, `NAV_`,
 * geometría) no le interesa al core. Posiciones en coordenadas de mundo.
 */
export type SceneNode = { id: string; position: Vec3 } & (
  | { kind: 'trigger' | 'oneway'; aabb: Aabb }
  | { kind: 'spawn' | 'checkpoint' | 'marker'; yaw?: number }
  | { kind: 'pickup' | 'interactable'; radius?: number }
);

export type SceneNodeKind = SceneNode['kind'];

export const DEFAULT_NODE_RADIUS = 1;

/** Ids de nodos que el escenario espera en el glTF de `zone` (atajo de `collectSceneNodeIds`). */
export function expectedNodesForZone(scenario: Scenario, zone: ZoneId): ReadonlySet<string> {
  return collectSceneNodeIds(scenario)[zone];
}

/** Tipo de nodo que corresponde a un id según su prefijo; `null` si no es un id de gameplay. */
export function sceneNodeKindForId(id: string): SceneNodeKind | null {
  if (ID_PATTERNS.trigger.test(id)) return 'trigger';
  if (ID_PATTERNS.oneway.test(id)) return 'oneway';
  if (ID_PATTERNS.spawn.test(id)) return 'spawn';
  if (ID_PATTERNS.checkpoint.test(id)) return 'checkpoint';
  if (ID_PATTERNS.marker.test(id)) return 'marker';
  if (ID_PATTERNS.pickup.test(id)) return 'pickup';
  if (ID_PATTERNS.interactable.test(id)) return 'interactable';
  return null;
}
