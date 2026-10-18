export { createFixedStepLoop } from './loop/fixed-step';
export type { FixedStepLoop, FixedStepLoopOptions } from './loop/fixed-step';

export { createNeutralIntent } from './adapters/input';
export type { InputAdapter, PlayerIntent } from './adapters/input';
export type { StorageAdapter } from './adapters/storage';
export type { HapticImpact, HapticNotification, HapticsAdapter } from './adapters/haptics';
export type { AudioAdapter, AudioPlayOptions } from './adapters/audio';
export { createSeededRng } from './adapters/rng';
export type { Rng } from './adapters/rng';
export { createNullAdapters } from './adapters/null-adapters';
export type {
  MemoryStorageAdapter,
  NullAdapters,
  RecordingAudioAdapter,
  RecordingHapticsAdapter,
  ScriptedInputAdapter,
} from './adapters/null-adapters';

export { createEventBus } from './events/event-bus';
export type { EventBus, EventHandler } from './events/event-bus';
export type {
  GameEventBus,
  GameEventMap,
  GameEventType,
  GamePhase,
  InteractableKind,
  ScenarioSummary,
} from './events/game-events';

export { DEFAULT_GAME_SETTINGS, MAX_HEALTH } from './game/settings';
export type { GameSettings, Locale } from './game/settings';
export type { CheckpointSnapshot } from './game/snapshot';

export { DEFAULT_NODE_RADIUS, expectedNodesForZone, sceneNodeKindForId } from './world/scene-nodes';
export type { SceneNode, SceneNodeKind } from './world/scene-nodes';

export type { Aabb } from './math/aabb';
export { add, distance, length, lerp, scale, sub, vec3, ZERO } from './math/vec3';
export type { Vec3 } from './math/vec3';
