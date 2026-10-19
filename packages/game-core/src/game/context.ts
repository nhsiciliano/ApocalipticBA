import type {
  Checkpoint,
  CheckpointId,
  Encounter,
  Interactable,
  LocalizedText,
  Note,
  NoteId,
  Oneway,
  Pickup,
  PickupItem,
  Scenario,
  Trigger,
  Zone,
  ZoneId,
} from '@apocalipticba/shared';

import { MAX_HEALTH, type GameSettings } from './settings.ts';
import type { RestorePoint } from './snapshot.ts';
import type { AudioAdapter } from '../adapters/audio.ts';
import type { HapticsAdapter } from '../adapters/haptics.ts';
import { createNeutralIntent, type InputAdapter } from '../adapters/input.ts';
import type { Rng } from '../adapters/rng.ts';
import type { StorageAdapter } from '../adapters/storage.ts';
import { createEcs, type Ecs, type Entity, type PlayerEntity } from '../ecs/world.ts';
import type { GameEventBus, GamePhase } from '../events/game-events.ts';
import { resolveText } from '../i18n/text.ts';
import { ZERO } from '../math/vec3.ts';

export interface ScenarioIndex {
  zones: ReadonlyMap<ZoneId, Zone>;
  triggers: ReadonlyMap<string, Trigger>;
  encounters: ReadonlyMap<string, Encounter>;
  checkpoints: ReadonlyMap<string, Checkpoint>;
  notes: ReadonlyMap<string, Note>;
  pickups: ReadonlyMap<string, Pickup>;
  interactables: ReadonlyMap<string, Interactable>;
  oneways: ReadonlyMap<string, Oneway>;
  /** Pickups que solo se recogen con un `INT_pickup_*` (no por radio). */
  interactionOnlyPickups: ReadonlySet<string>;
}

export interface HoldState {
  progress: number;
  started: boolean;
}

export interface ClimbState {
  id: string;
  path: readonly (readonly [number, number, number])[];
  /** Distancia acumulada al inicio de cada punto del camino. */
  cumulative: readonly number[];
  totalLength: number;
  durationMs: number;
  elapsedMs: number;
}

/** Estado mutable de la partida que no vive en el ECS. Lo serializable va al snapshot. */
export interface RuntimeState {
  phase: GamePhase;
  zone: ZoneId;
  loadedZones: Set<ZoneId>;
  /** Zonas descargadas por un oneway: no vuelven a cargarse. */
  retiredZones: Set<ZoneId>;
  zoneEntities: Map<ZoneId, Entity[]>;
  flags: Set<string>;
  inventory: Map<PickupItem, number>;
  objectiveIndex: number;
  consumedPickups: Set<string>;
  crossedOneways: Set<string>;
  openedGates: Set<string>;
  completedHolds: Set<string>;
  firedTriggers: Set<string>;
  notesFound: Set<NoteId>;
  holds: Map<string, HoldState>;
  activeEncounters: Set<string>;
  elapsedMs: number;
  flashlight: boolean;
  checkpointId: CheckpointId | null;
  lastSnapshot: RestorePoint | null;
  initialRestorePoint: RestorePoint;
  /** Id que informó el host con `setCandidate` (sin validar). */
  requestedCandidate: string | null;
  /** Candidato validado (existe, está cargado, en rango y disponible). */
  candidate: string | null;
  openNote: { interactableId: string; noteId: NoteId } | null;
  climb: ClimbState | null;
  /** Pasa a `true` la primera vez que el host llama `commitMove`. */
  hostResolvesCollisions: boolean;
  /** Piso del modo sin colisión: la Y del spawn del jugador. */
  groundY: number;
  /** El jugador ya se ubicó en el spawn (o por teleport / restore). */
  placed: boolean;
  persistQueue: Promise<void>;
  disposed: boolean;
}

export interface GameContext {
  scenario: Scenario;
  settings: GameSettings;
  events: GameEventBus;
  input: InputAdapter;
  storage: StorageAdapter;
  haptics: HapticsAdapter | null;
  audio: AudioAdapter | null;
  rng: Rng;
  ecs: Ecs;
  player: PlayerEntity;
  index: ScenarioIndex;
  run: RuntimeState;
  text(value: LocalizedText): string;
  warn(message: string): void;
}

export interface ContextOptions {
  scenario: Scenario;
  settings: GameSettings;
  events: GameEventBus;
  input: InputAdapter;
  storage: StorageAdapter;
  haptics: HapticsAdapter | null;
  audio: AudioAdapter | null;
  rng: Rng;
}

export function createContext(options: ContextOptions): GameContext {
  const { scenario, settings, events } = options;
  const ecs = createEcs();
  const player = ecs.world.add({
    player: true,
    transform: { position: ZERO, yaw: 0, pitch: 0 },
    velocity: { value: ZERO },
    intent: createNeutralIntent(),
    health: { current: MAX_HEALTH, max: MAX_HEALTH },
    body: { grounded: true, crouching: false, desiredDelta: ZERO },
  });

  const initialRestorePoint: RestorePoint = {
    version: 1,
    scenarioId: scenario.id,
    checkpointId: null,
    position: ZERO,
    yaw: 0,
    health: MAX_HEALTH,
    inventory: [],
    flags: [],
    objectiveIndex: 0,
    consumedPickups: [],
    crossedOneways: [],
    openedGates: [],
    completedHolds: [],
    firedTriggers: [],
    notesFound: [],
    elapsedMs: 0,
  };

  return {
    ...options,
    ecs,
    player,
    index: indexScenario(scenario),
    run: {
      phase: 'playing',
      zone: scenario.start.zone,
      loadedZones: new Set(),
      retiredZones: new Set(),
      zoneEntities: new Map(),
      flags: new Set(),
      inventory: new Map(),
      objectiveIndex: 0,
      consumedPickups: new Set(),
      crossedOneways: new Set(),
      openedGates: new Set(),
      completedHolds: new Set(),
      firedTriggers: new Set(),
      notesFound: new Set(),
      holds: new Map(),
      activeEncounters: new Set(),
      elapsedMs: 0,
      flashlight: false,
      checkpointId: null,
      lastSnapshot: null,
      initialRestorePoint,
      requestedCandidate: null,
      candidate: null,
      openNote: null,
      climb: null,
      hostResolvesCollisions: false,
      groundY: 0,
      placed: false,
      persistQueue: Promise.resolve(),
      disposed: false,
    },
    text: (value) => resolveText(value, settings.locale),
    warn: (message) => {
      events.emit('debug.warn', { message });
    },
  };
}

function byId<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function indexScenario(scenario: Scenario): ScenarioIndex {
  const interactionOnlyPickups = new Set<string>();
  for (const interactable of scenario.interactables) {
    if (interactable.kind === 'pickup') interactionOnlyPickups.add(interactable.pickupId);
  }
  return {
    zones: new Map(scenario.zones.map((zone) => [zone.id, zone])),
    triggers: byId(scenario.triggers),
    encounters: byId(scenario.encounters),
    checkpoints: byId(scenario.checkpoints),
    notes: byId(scenario.notes),
    pickups: byId(scenario.pickups),
    interactables: byId(scenario.interactables),
    oneways: byId(scenario.oneways),
    interactionOnlyPickups,
  };
}

/** Cambia la fase y avisa; no hace nada si ya estaba en esa fase. */
export function setPhase(ctx: GameContext, phase: GamePhase): void {
  if (ctx.run.phase === phase) return;
  ctx.run.phase = phase;
  ctx.events.emit('player.phase', { phase });
}

/** Altura actual de la cápsula (parado o agachado). */
export function playerHeight(ctx: GameContext): number {
  return ctx.player.body.crouching ? ctx.settings.crouchHeight : ctx.settings.playerHeight;
}
