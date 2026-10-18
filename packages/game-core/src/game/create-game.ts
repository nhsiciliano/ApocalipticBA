import type { CheckpointId, PickupItem, Scenario, ZoneId } from '@apocalipticba/shared';

import { createContext, type GameContext } from './context';
import { DEFAULT_GAME_SETTINGS, type GameSettings } from './settings';
import { parseSnapshot } from './snapshot';
import { endEncounter } from '../actions/run-actions';
import type { AudioAdapter } from '../adapters/audio';
import type { HapticsAdapter } from '../adapters/haptics';
import type { InputAdapter } from '../adapters/input';
import { createSeededRng, type Rng } from '../adapters/rng';
import type { StorageAdapter } from '../adapters/storage';
import { createEventBus } from '../events/event-bus';
import type { GameEventBus, GameEventMap, GamePhase } from '../events/game-events';
import type { Vec3 } from '../math/vec3';
import { persist, restore, saveKey } from '../systems/checkpoints';
import { flashlightSystem } from '../systems/flashlight';
import { damage, respawn } from '../systems/health';
import {
  closeNote,
  currentInteraction,
  interactionSystem,
  setCandidate,
  type InteractionCurrent,
} from '../systems/interaction';
import { currentObjective } from '../systems/objectives';
import { pickupsSystem } from '../systems/pickups';
import {
  commitMove,
  playerMovementSystem,
  teleport,
  type MoveResult,
} from '../systems/player-movement';
import { onewaysSystem, triggersSystem } from '../systems/triggers';
import type { SceneNode } from '../world/scene-nodes';
import { registerZoneNodes, setCurrentZone, unregisterZone } from '../world/zones';

export interface GameAdapters {
  input: InputAdapter;
  storage: StorageAdapter;
  haptics?: HapticsAdapter;
  audio?: AudioAdapter;
}

export interface CreateGameOptions {
  /** Escenario ya validado con `parseScenario` de `@apocalipticba/shared`. */
  scenario: Scenario;
  adapters: GameAdapters;
  /** Azar inyectable. Default: `createSeededRng(0)`. Reservado para encuentros y armas (Fase 1). */
  rng?: Rng;
  settings?: Partial<GameSettings>;
}

/** Vista de solo lectura para HUD y debug. Para reaccionar a cambios, suscribite a `events`. */
export interface GameStateView {
  readonly objective: { id: string; text: string } | null;
  readonly health: number;
  readonly maxHealth: number;
  readonly inventory: ReadonlyMap<PickupItem, number>;
  readonly flags: ReadonlySet<string>;
  readonly checkpointId: CheckpointId | null;
  readonly zone: ZoneId;
  readonly phase: GamePhase;
  readonly flashlight: boolean;
  readonly elapsedMs: number;
  readonly notesFound: ReadonlySet<string>;
}

export interface PlayerPort {
  /** Pies del jugador (base de la cápsula), en metros. */
  readonly position: Vec3;
  readonly velocity: Vec3;
  readonly yaw: number;
  readonly pitch: number;
  readonly grounded: boolean;
  readonly crouching: boolean;
  /** Altura de los ojos sobre `position` (cambia al agacharse). */
  readonly eyeHeight: number;
  /** Altura actual de la cápsula. */
  readonly height: number;
  /** Desplazamiento pedido en el último `step`; el host lo resuelve contra el BVH. */
  readonly desiredDelta: Vec3;
  /**
   * Resultado del movimiento resuelto por el host. La primera llamada desactiva para siempre el
   * modo sin colisión. Se ignora durante `climbing`, `dead` y `finished`.
   */
  commitMove(result: MoveResult): void;
  teleport(position: Vec3, yaw?: number): void;
  damage(amount: number): void;
  /** Reaparece en el último checkpoint (o en el inicio). */
  respawn(): void;
}

export interface WorldPort {
  registerZoneNodes(zone: ZoneId, nodes: readonly SceneNode[]): void;
  unregisterZone(zone: ZoneId): void;
  setCurrentZone(zone: ZoneId): void;
  readonly loadedZones: ReadonlySet<ZoneId>;
  /**
   * Ids ya resueltos que el host no debe volver a mostrar ni bloquear: pickups recogidos, puertas
   * abiertas, sostenidas completadas y oneways cruzados. Releer tras `checkpoint.restored`.
   */
  readonly resolved: ReadonlySet<string>;
  /** Termina un encuentro activo y ejecuta su `onEnd` (en Fase 0 no hay spawner). */
  debugEndEncounter(id: string): void;
}

export interface InteractionPort {
  setCandidate(id: string | null): void;
  closeNote(): void;
  readonly current: InteractionCurrent | null;
}

export interface Game {
  /** Un paso de simulación. Lee `input.sample()` adentro. */
  step(dtSeconds: number): void;
  readonly events: GameEventBus;
  readonly state: GameStateView;
  readonly player: PlayerPort;
  readonly world: WorldPort;
  readonly interaction: InteractionPort;
  /** Persiste el último checkpoint en `save:<scenario.id>`; no hace nada si todavía no hay. */
  save(): Promise<void>;
  /** Carga `save:<scenario.id>` y arranca en ese checkpoint. `false` si no hay guardado válido. */
  load(): Promise<boolean>;
  dispose(): void;
}

/**
 * Crea una partida. Orden de sistemas en cada `step`: input → movimiento (o trepar) → triggers →
 * oneways → pickups → interacción → linterna. Objetivos, checkpoints y fase reaccionan a las
 * acciones dentro de esos sistemas, en el mismo paso.
 */
export function createGame(options: CreateGameOptions): Game {
  const settings: GameSettings = { ...DEFAULT_GAME_SETTINGS, ...options.settings };
  const events = createEventBus<GameEventMap>();
  const ctx = createContext({
    scenario: options.scenario,
    settings,
    events,
    input: options.adapters.input,
    storage: options.adapters.storage,
    haptics: options.adapters.haptics ?? null,
    audio: options.adapters.audio ?? null,
    rng: options.rng ?? createSeededRng(0),
  });

  const assertAlive = (): void => {
    if (ctx.run.disposed) throw new Error('Game was disposed');
  };

  return {
    events,
    state: createStateView(ctx),
    player: createPlayerPort(ctx),
    world: {
      registerZoneNodes: (zone, nodes) => {
        assertAlive();
        registerZoneNodes(ctx, zone, nodes);
      },
      unregisterZone: (zone) => {
        unregisterZone(ctx, zone);
      },
      setCurrentZone: (zone) => {
        setCurrentZone(ctx, zone);
      },
      get loadedZones() {
        return ctx.run.loadedZones;
      },
      get resolved() {
        return new Set([
          ...ctx.run.consumedPickups,
          ...ctx.run.openedGates,
          ...ctx.run.completedHolds,
          ...ctx.run.crossedOneways,
        ]);
      },
      debugEndEncounter: (id) => {
        endEncounter(ctx, id);
      },
    },
    interaction: {
      setCandidate: (id) => {
        setCandidate(ctx, id);
      },
      closeNote: () => {
        closeNote(ctx);
      },
      get current() {
        return currentInteraction(ctx);
      },
    },
    step(dtSeconds) {
      assertAlive();
      if (!(dtSeconds > 0) || !Number.isFinite(dtSeconds)) {
        throw new RangeError(
          `step(dtSeconds) needs a positive finite dt, got ${String(dtSeconds)}`,
        );
      }
      step(ctx, dtSeconds);
    },
    save() {
      const snapshot = ctx.run.lastSnapshot;
      const checkpointId = snapshot?.checkpointId ?? null;
      if (snapshot === null || checkpointId === null) return ctx.run.persistQueue;
      return persist(ctx, { ...snapshot, checkpointId });
    },
    async load() {
      assertAlive();
      const data = await ctx.storage.load<unknown>(saveKey(ctx));
      if (data === null) return false;
      const parsed = parseSnapshot(data, ctx.scenario);
      if (!parsed.ok) {
        ctx.warn(`Ignoring ${saveKey(ctx)}: ${parsed.reason}`);
        return false;
      }
      restore(ctx, parsed.snapshot, true);
      return true;
    },
    dispose() {
      if (ctx.run.disposed) return;
      ctx.run.disposed = true;
      ctx.ecs.world.clear();
      events.clear();
    },
  };
}

function step(ctx: GameContext, dt: number): void {
  if (ctx.run.phase !== 'finished') ctx.run.elapsedMs += dt * 1000;
  const intent = ctx.input.sample();
  playerMovementSystem(ctx, intent, dt);
  triggersSystem(ctx);
  onewaysSystem(ctx);
  pickupsSystem(ctx);
  interactionSystem(ctx, intent, dt);
  flashlightSystem(ctx, intent);
}

function createStateView(ctx: GameContext): GameStateView {
  const { run, player } = ctx;
  return {
    get objective() {
      return currentObjective(ctx);
    },
    get health() {
      return player.health.current;
    },
    get maxHealth() {
      return player.health.max;
    },
    get inventory() {
      return run.inventory;
    },
    get flags() {
      return run.flags;
    },
    get checkpointId() {
      return run.checkpointId;
    },
    get zone() {
      return run.zone;
    },
    get phase() {
      return run.phase;
    },
    get flashlight() {
      return run.flashlight;
    },
    get elapsedMs() {
      return run.elapsedMs;
    },
    get notesFound() {
      return run.notesFound;
    },
  };
}

function createPlayerPort(ctx: GameContext): PlayerPort {
  const { player, settings } = ctx;
  const height = (): number =>
    player.body.crouching ? settings.crouchHeight : settings.playerHeight;
  return {
    get position() {
      return player.transform.position;
    },
    get velocity() {
      return player.velocity.value;
    },
    get yaw() {
      return player.transform.yaw;
    },
    get pitch() {
      return player.transform.pitch;
    },
    get grounded() {
      return player.body.grounded;
    },
    get crouching() {
      return player.body.crouching;
    },
    get eyeHeight() {
      return height() * settings.eyeHeightRatio;
    },
    get height() {
      return height();
    },
    get desiredDelta() {
      return player.body.desiredDelta;
    },
    commitMove: (result) => {
      commitMove(ctx, result);
    },
    teleport: (position, yaw) => {
      teleport(ctx, position, yaw);
    },
    damage: (amount) => {
      damage(ctx, amount);
    },
    respawn: () => {
      respawn(ctx);
    },
  };
}
