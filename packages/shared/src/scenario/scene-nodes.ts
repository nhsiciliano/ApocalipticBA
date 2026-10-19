import { ZONE_IDS, type ZoneId } from './ids.ts';
import type { Scenario } from './schema.ts';

export type SceneNodeIdsByZone = Record<ZoneId, Set<string>>;

/**
 * Ids que tienen que existir como nodos en el glTF de cada zona: triggers (`TRG_`), checkpoints
 * (`CHK_`), spawns (`SPAWN_`), pickups (`PICK_`), interactuables (`INT_`), bloqueos de un solo
 * sentido (`COL_oneway_`) y `markerNode` de los objetivos. Las claves son las 6 zonas; una zona sin
 * entidades devuelve un Set vacío. El validador de niveles (Hito 8) cruza esto contra los glTF.
 */
export function collectSceneNodeIds(scenario: Scenario): SceneNodeIdsByZone {
  const byZone = Object.fromEntries(
    ZONE_IDS.map((zone) => [zone, new Set<string>()]),
  ) as SceneNodeIdsByZone;

  byZone[scenario.start.zone].add(scenario.start.spawnId);

  for (const objective of scenario.objectives) {
    if (objective.markerNode !== undefined) byZone[objective.zone].add(objective.markerNode);
  }
  for (const trigger of scenario.triggers) byZone[trigger.zone].add(trigger.id);
  for (const encounter of scenario.encounters) {
    for (const wave of encounter.waves) {
      for (const spawnId of wave.spawnIds) byZone[encounter.zone].add(spawnId);
    }
  }
  for (const checkpoint of scenario.checkpoints) byZone[checkpoint.zone].add(checkpoint.id);
  for (const pickup of scenario.pickups) byZone[pickup.zone].add(pickup.id);
  for (const interactable of scenario.interactables) {
    byZone[interactable.zone].add(interactable.id);
  }
  for (const oneway of scenario.oneways) byZone[oneway.zone].add(oneway.id);

  return byZone;
}
