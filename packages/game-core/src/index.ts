export { createFixedStepLoop } from './loop/fixed-step.ts';
export type { FixedStepLoop, FixedStepLoopOptions } from './loop/fixed-step.ts';

export { createNeutralIntent } from './adapters/input.ts';
export type { InputAdapter, PlayerIntent } from './adapters/input.ts';
export type { StorageAdapter } from './adapters/storage.ts';
export type { HapticImpact, HapticNotification, HapticsAdapter } from './adapters/haptics.ts';
export type { AudioAdapter, AudioPlayOptions } from './adapters/audio.ts';
export { createSeededRng } from './adapters/rng.ts';
export type { Rng } from './adapters/rng.ts';
export { createNullAdapters } from './adapters/null-adapters.ts';
export type {
  MemoryStorageAdapter,
  NullAdapters,
  RecordingAudioAdapter,
  RecordingHapticsAdapter,
  ScriptedInputAdapter,
} from './adapters/null-adapters.ts';

export { createEventBus } from './events/event-bus.ts';
export type { EventBus, EventHandler } from './events/event-bus.ts';
export type {
  GameEventBus,
  GameEventMap,
  GameEventType,
  GamePhase,
  InteractableKind,
  ScenarioSummary,
} from './events/game-events.ts';

export { createGame } from './game/create-game.ts';
export type {
  CreateGameOptions,
  Game,
  GameAdapters,
  GameStateView,
  InteractionPort,
  PlayerPort,
  WorldPort,
} from './game/create-game.ts';
export { DEFAULT_GAME_SETTINGS, MAX_HEALTH } from './game/settings.ts';
export type { GameSettings, Locale } from './game/settings.ts';
export type { CheckpointSnapshot } from './game/snapshot.ts';
export type { InteractionCurrent } from './systems/interaction.ts';
export type { MoveResult } from './systems/player-movement.ts';

export {
  DEFAULT_NODE_RADIUS,
  expectedNodesForZone,
  sceneNodeKindForId,
} from './world/scene-nodes.ts';
export type { SceneNode, SceneNodeKind } from './world/scene-nodes.ts';

export type { Aabb } from './math/aabb.ts';
export { add, distance, length, lerp, scale, sub, vec3, ZERO } from './math/vec3.ts';
export type { Vec3 } from './math/vec3.ts';
