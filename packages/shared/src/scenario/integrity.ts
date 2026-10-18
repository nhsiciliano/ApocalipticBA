import { BACKGROUND_ZONE, ID_PATTERNS } from './ids';
import type { Action, ScenarioBase } from './schema';

type IssuePath = (string | number)[];

interface IssueSink {
  addIssue(issue: { code: 'custom'; message: string; path: IssuePath }): void;
}

/**
 * Chequeos cruzados de `scenario.json` que Zod no puede expresar por campo: ids únicos y que toda
 * referencia apunte a algo que existe. Cada problema lleva el `path` del campo que falla.
 *
 * Los spawns (`SPAWN_*`) no se declaran en el JSON: viven como nodos del glTF. Por eso acá solo se
 * valida que pertenezcan a su encuentro (o que sea el spawn del jugador); que el nodo exista en el
 * glTF lo verifica el validador de niveles con `collectSceneNodeIds`.
 */
export function checkScenarioIntegrity(scenario: ScenarioBase, ctx: IssueSink): void {
  const issue = (path: IssuePath, message: string): void => {
    ctx.addIssue({ code: 'custom', message, path });
  };

  const zoneIds = new Set<string>(scenario.zones.map((zone) => zone.id));
  const objectiveIds = new Set(scenario.objectives.map((objective) => objective.id));
  const encounterIds = new Set(scenario.encounters.map((encounter) => encounter.id));
  const checkpointIds = new Set(scenario.checkpoints.map((checkpoint) => checkpoint.id));
  const noteIds = new Set(scenario.notes.map((note) => note.id));
  const pickupIds = new Set(scenario.pickups.map((pickup) => pickup.id));

  checkUniqueIds(scenario, issue);

  const checkZoneRef = (zone: string, path: IssuePath, allowBackground = false): void => {
    if (!zoneIds.has(zone)) {
      issue(path, `Unknown zone "${zone}"`);
    } else if (!allowBackground && zone === BACKGROUND_ZONE) {
      issue(path, `${BACKGROUND_ZONE} is decoration only and cannot own gameplay entities`);
    }
  };

  const checkAction = (action: Action, path: IssuePath): void => {
    switch (action.type) {
      case 'objective.advance':
      case 'objective.complete':
        if (!objectiveIds.has(action.objectiveId)) {
          issue([...path, 'objectiveId'], `Unknown objective "${action.objectiveId}"`);
        }
        break;
      case 'encounter.start':
        if (!encounterIds.has(action.encounterId)) {
          issue([...path, 'encounterId'], `Unknown encounter "${action.encounterId}"`);
        }
        break;
      case 'checkpoint.save':
        if (!checkpointIds.has(action.checkpointId)) {
          issue([...path, 'checkpointId'], `Unknown checkpoint "${action.checkpointId}"`);
        }
        break;
      case 'zone.unload':
      case 'zone.preload':
        action.zones.forEach((zone, k) => {
          checkZoneRef(zone, [...path, 'zones', k], true);
        });
        break;
      case 'audio.play':
      case 'text.show':
      case 'flag.set':
        break;
    }
  };

  const checkActions = (actions: Action[], path: IssuePath): void => {
    actions.forEach((action, j) => {
      checkAction(action, [...path, j]);
    });
  };

  checkZoneRef(scenario.start.zone, ['start', 'zone']);
  if (!ID_PATTERNS.playerSpawn.test(scenario.start.spawnId)) {
    issue(['start', 'spawnId'], 'start.spawnId must be a player spawn (SPAWN_player_start_<n>)');
  }

  scenario.zones.forEach((zone, i) => {
    zone.preload.forEach((preloaded, k) => {
      checkZoneRef(preloaded, ['zones', i, 'preload', k], true);
    });
  });

  scenario.objectives.forEach((objective, i) => {
    checkZoneRef(objective.zone, ['objectives', i, 'zone']);
  });

  scenario.triggers.forEach((trigger, i) => {
    checkZoneRef(trigger.zone, ['triggers', i, 'zone']);
    checkActions(trigger.actions, ['triggers', i, 'actions']);
  });

  scenario.encounters.forEach((encounter, i) => {
    checkZoneRef(encounter.zone, ['encounters', i, 'zone']);
    encounter.waves.forEach((wave, w) => {
      wave.spawnIds.forEach((spawnId, k) => {
        if (!isSpawnOfEncounter(spawnId, encounter.id)) {
          issue(
            ['encounters', i, 'waves', w, 'spawnIds', k],
            `Spawn "${spawnId}" does not belong to encounter "${encounter.id}" (expected SPAWN_${encounter.id}_<n>)`,
          );
        }
      });
    });
    checkActions(encounter.onEnd, ['encounters', i, 'onEnd']);
  });

  scenario.checkpoints.forEach((checkpoint, i) => {
    checkZoneRef(checkpoint.zone, ['checkpoints', i, 'zone']);
  });

  scenario.pickups.forEach((pickup, i) => {
    checkZoneRef(pickup.zone, ['pickups', i, 'zone']);
  });

  scenario.interactables.forEach((interactable, i) => {
    const path: IssuePath = ['interactables', i];
    checkZoneRef(interactable.zone, [...path, 'zone']);
    switch (interactable.kind) {
      case 'note':
        if (!noteIds.has(interactable.noteId)) {
          issue([...path, 'noteId'], `Unknown note "${interactable.noteId}"`);
        }
        checkActions(interactable.onRead, [...path, 'onRead']);
        break;
      case 'hold':
        checkActions(interactable.onStart, [...path, 'onStart']);
        checkActions(interactable.onComplete, [...path, 'onComplete']);
        break;
      case 'climb':
        checkActions(interactable.onComplete, [...path, 'onComplete']);
        break;
      case 'gate':
        checkActions(interactable.onOpen, [...path, 'onOpen']);
        break;
      case 'pickup':
        if (!pickupIds.has(interactable.pickupId)) {
          issue([...path, 'pickupId'], `Unknown pickup "${interactable.pickupId}"`);
        }
        break;
      case 'locked':
        break;
    }
  });

  scenario.oneways.forEach((oneway, i) => {
    checkZoneRef(oneway.zone, ['oneways', i, 'zone']);
    oneway.unloadZones.forEach((zone, k) => {
      checkZoneRef(zone, ['oneways', i, 'unloadZones', k], true);
    });
  });
}

function isSpawnOfEncounter(spawnId: string, encounterId: string): boolean {
  const prefix = `SPAWN_${encounterId}_`;
  return spawnId.startsWith(prefix) && /^\d+$/.test(spawnId.slice(prefix.length));
}

/** Los ids son únicos dentro de cada colección y en el conjunto total del escenario. */
function checkUniqueIds(
  scenario: ScenarioBase,
  issue: (path: IssuePath, message: string) => void,
): void {
  const collections: Record<string, { id: string }[]> = {
    zones: scenario.zones,
    objectives: scenario.objectives,
    triggers: scenario.triggers,
    encounters: scenario.encounters,
    checkpoints: scenario.checkpoints,
    notes: scenario.notes,
    pickups: scenario.pickups,
    interactables: scenario.interactables,
    oneways: scenario.oneways,
  };

  const owners = new Map<string, string>();
  for (const [name, items] of Object.entries(collections)) {
    items.forEach((item, i) => {
      const owner = owners.get(item.id);
      if (owner === undefined) {
        owners.set(item.id, name);
      } else {
        issue(
          [name, i, 'id'],
          owner === name
            ? `Duplicate id "${item.id}" in ${name}`
            : `Id "${item.id}" is already used in ${owner}`,
        );
      }
    });
  }
}
