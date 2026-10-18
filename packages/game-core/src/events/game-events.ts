import type {
  AudioCueId,
  CheckpointId,
  EncounterId,
  Interactable,
  NoteId,
  ObjectiveId,
  PickupItem,
  ZoneId,
} from '@apocalipticba/shared';

import type { EventBus } from './event-bus';

export type GamePhase = 'playing' | 'reading_note' | 'climbing' | 'dead' | 'finished';
export type InteractableKind = Interactable['kind'];

export interface ScenarioSummary {
  timeMs: number;
  notesFound: number;
  notesTotal: number;
}

/**
 * Eventos que el core emite hacia el host y el HUD. Los textos ya vienen resueltos al locale de
 * `settings.locale`.
 */
export interface GameEventMap {
  'objective.changed': { id: ObjectiveId; text: string };
  'objective.completed': { id: ObjectiveId };
  'trigger.fired': { id: string };
  'checkpoint.saved': { id: CheckpointId };
  /** `id` es `null` cuando se reaparece en el inicio porque no había checkpoint. */
  'checkpoint.restored': { id: CheckpointId | null };
  /** En Fase 0 no hay spawner: solo se informa. */
  'encounter.start': { id: EncounterId };
  'encounter.end': { id: EncounterId };
  'zone.changed': { from: ZoneId; to: ZoneId };
  'zone.preload': { zones: readonly ZoneId[] };
  /** El host descarta la geometría de esas zonas; el core ya las desregistró. */
  'zone.unload': { zones: readonly ZoneId[] };
  /** Se cruzó un `COL_oneway_<id>`: el host activa su colisión (ya no se puede volver). */
  'oneway.crossed': { id: string; unloadZones: readonly ZoneId[] };
  'note.opened': { noteId: NoteId; title: string; body: string };
  'note.closed': { noteId: NoteId };
  /** Cambió el candidato de interacción válido; `null` = ocultar el indicador. */
  'interact.prompt': { id: string; prompt: string; kind: InteractableKind } | null;
  'interact.progress': { id: string; progress: number };
  'interact.completed': { id: string };
  'interact.locked': { id: string; message: string };
  'pickup.collected': { pickupId: string; item: PickupItem; amount: number };
  /** `amount` es el total nuevo en el inventario. */
  'inventory.changed': { item: PickupItem; amount: number };
  'flag.changed': { flag: string; value: boolean };
  'text.show': { text: string; durationMs: number };
  'audio.play': { cueId: AudioCueId; loop: boolean };
  /**
   * Cambio de fase del jugador. Durante `climbing` el core mueve la posición por un camino guionado:
   * el host ignora colisiones, no llama `commitMove` y solo copia `player.position` a la cámara.
   */
  'player.phase': { phase: GamePhase };
  'player.health': { health: number; maxHealth: number };
  'player.died': undefined;
  'flashlight.changed': { on: boolean };
  'player.respawned': { checkpointId: CheckpointId | null };
  'scenario.finished': { summary: ScenarioSummary };
  /** Canal de diagnóstico: usos inválidos de la API o datos inconsistentes. No es para el HUD. */
  'debug.warn': { message: string };
}

export type GameEventType = keyof GameEventMap;
export type GameEventBus = EventBus<GameEventMap>;
