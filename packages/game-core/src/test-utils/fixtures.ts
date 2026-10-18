import { parseScenario, ZONE_IDS, type Scenario, type ZoneId } from '@apocalipticba/shared';

import {
  minimalScenarioJson,
  withChanges,
} from '../../../shared/src/scenario/__fixtures__/minimal';
import { createNullAdapters, type NullAdapters } from '../adapters/null-adapters';
import type { GameEventMap, GameEventType } from '../events/game-events';
import { createGame, type Game } from '../game/create-game';
import type { GameSettings } from '../game/settings';
import type { Vec3 } from '../math/vec3';
import { expectedNodesForZone, sceneNodeKindForId, type SceneNode } from '../world/scene-nodes';

export const DT = 1 / 60;

/** El escenario mínimo de `@apocalipticba/shared`, validado. */
export function minimalScenario(): Scenario {
  return parseScenario(minimalScenarioJson);
}

/** El escenario mínimo con cambios puntuales (ver `withChanges` en shared). */
export function scenarioWith(...changes: Parameters<typeof withChanges>): Scenario {
  return parseScenario(withChanges(...changes));
}

/** Escenario mínimo + segunda carta en Z5 como objetivo final (recorrido Z1→Z5). */
export function fullRunScenario(): Scenario {
  return scenarioWith(
    [
      ['objectives', 2],
      { id: 'obj_leer_carta_2', zone: 'Z5_Interior', text: { 'es-AR': 'Buscá la segunda carta' } },
    ],
    [
      ['interactables', 5],
      {
        id: 'INT_note_carta_2',
        zone: 'Z5_Interior',
        prompt: { 'es-AR': 'Leer' },
        kind: 'note',
        noteId: 'note_carta_2',
        onRead: [{ type: 'objective.complete', objectiveId: 'obj_leer_carta_2' }],
      },
    ],
  );
}

interface NodeLayout {
  position: Vec3;
  yaw?: number;
  radius?: number;
  aabb?: { min: Vec3; max: Vec3 };
}

/**
 * Layout sintético del recorrido. Z1 queda lejos (x = 100) para no pisarse con el andamio, cuyo
 * `path` en el fixture arranca en el origen. Posiciones = pies / centro del nodo.
 */
export const LAYOUT: Readonly<Record<string, NodeLayout>> = {
  SPAWN_player_start_1: { position: [100, 0, 0], yaw: 0 },
  INT_note_carta_1: { position: [100, 0, -2] },
  PICK_pistola_1: { position: [103, 0, 0] },
  PICK_escopeta_1: { position: [97, 0, 0] },
  PICK_municion_pistola_1: { position: [100, 0, 6] },
  PICK_municion_pistola_2: { position: [100, 0, 9] },
  PICK_linterna_1: { position: [94, 0, 0] },
  INT_pickup_escopeta: { position: [97, 0, 0] },
  INT_gate_salida_hall: { position: [100, 0, -10] },
  INT_locked_reja: { position: [50, 0, 0] },
  TRG_esquina_4a: { position: [0, 0, -20], aabb: { min: [-2, 0, -22], max: [2, 3, -18] } },
  TRG_contrafuerte: { position: [0, 0, -30], aabb: { min: [-2, 0, -32], max: [2, 3, -28] } },
  CHK_4a: { position: [0, 0, -20], yaw: Math.PI },
  SPAWN_enc_4a_1: { position: [6, 0, -40] },
  SPAWN_enc_4a_2: { position: [7, 0, -40] },
  SPAWN_enc_4a_3: { position: [8, 0, -40] },
  INT_climb_andamio: { position: [0, 0, -1] },
  COL_oneway_andamio: { position: [0, 4, 2], aabb: { min: [-1, 3.5, 1.2], max: [1, 5, 2.5] } },
  CHK_4c: { position: [0, 0, 2.5], yaw: 0 },
  INT_hold_sacristia: { position: [0, 0, 4] },
  MRK_sacristia: { position: [0, 0, 6] },
  INT_note_carta_2: { position: [0, 0, 10] },
};

/** Nodos de una zona según lo que espera el escenario, ubicados con `LAYOUT`. */
export function nodesForZone(scenario: Scenario, zone: ZoneId): SceneNode[] {
  return [...expectedNodesForZone(scenario, zone)].map((id) => {
    const layout = LAYOUT[id];
    const kind = sceneNodeKindForId(id);
    if (layout === undefined || kind === null) throw new Error(`No test layout for node ${id}`);
    switch (kind) {
      case 'trigger':
      case 'oneway':
        if (layout.aabb === undefined) throw new Error(`Node ${id} needs an aabb`);
        return { id, kind, position: layout.position, aabb: layout.aabb };
      case 'spawn':
      case 'checkpoint':
      case 'marker':
        return layout.yaw === undefined
          ? { id, kind, position: layout.position }
          : { id, kind, position: layout.position, yaw: layout.yaw };
      case 'pickup':
      case 'interactable':
        return layout.radius === undefined
          ? { id, kind, position: layout.position }
          : { id, kind, position: layout.position, radius: layout.radius };
    }
  });
}

export const ALL_EVENT_TYPES: readonly GameEventType[] = [
  'objective.changed',
  'objective.completed',
  'trigger.fired',
  'checkpoint.saved',
  'checkpoint.restored',
  'encounter.start',
  'encounter.end',
  'zone.changed',
  'zone.preload',
  'zone.unload',
  'oneway.crossed',
  'note.opened',
  'note.closed',
  'interact.prompt',
  'interact.progress',
  'interact.completed',
  'interact.locked',
  'pickup.collected',
  'inventory.changed',
  'flag.changed',
  'text.show',
  'audio.play',
  'player.phase',
  'player.health',
  'player.died',
  'flashlight.changed',
  'player.respawned',
  'scenario.finished',
  'debug.warn',
];

export type RecordedEvent = {
  [K in GameEventType]: { type: K; payload: GameEventMap[K] };
}[GameEventType];

export interface EventLog {
  readonly all: RecordedEvent[];
  of<K extends GameEventType>(type: K): GameEventMap[K][];
  clear(): void;
}

export function recordEvents(game: Game): EventLog {
  const all: RecordedEvent[] = [];
  for (const type of ALL_EVENT_TYPES) {
    game.events.on(type, (payload?: unknown) => {
      all.push({ type, payload } as RecordedEvent);
    });
  }
  return {
    all,
    of<K extends GameEventType>(type: K) {
      return all
        .filter((event) => event.type === type)
        .map((event) => event.payload as GameEventMap[K]);
    },
    clear() {
      all.length = 0;
    },
  };
}

export interface TestGame {
  game: Game;
  adapters: NullAdapters;
  log: EventLog;
  scenario: Scenario;
  /** Corre `n` pasos de 1/60 s. */
  run(n?: number): void;
}

export interface TestGameOptions {
  scenario?: Scenario;
  settings?: Partial<GameSettings>;
  /** Zonas a registrar al crear. Default: todas. */
  zones?: readonly ZoneId[];
  adapters?: NullAdapters;
}

export function createTestGame(options: TestGameOptions = {}): TestGame {
  const scenario = options.scenario ?? minimalScenario();
  const adapters = options.adapters ?? createNullAdapters();
  const game = createGame({
    scenario,
    adapters,
    ...(options.settings === undefined ? {} : { settings: options.settings }),
  });
  const log = recordEvents(game);
  for (const zone of options.zones ?? ZONE_IDS) {
    game.world.registerZoneNodes(zone, nodesForZone(scenario, zone));
  }
  log.clear();
  return {
    game,
    adapters,
    log,
    scenario,
    run(n = 1) {
      for (let i = 0; i < n; i += 1) game.step(DT);
    },
  };
}
