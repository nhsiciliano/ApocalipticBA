import { z } from 'zod';

/**
 * Patrones de ids. Coinciden con los nombres de objetos en Blender/glTF (docs/prompt-base.md 2.6),
 * así el validador de niveles puede cruzar `scenario.json` contra los glTF por nombre.
 */
export const ID_PATTERNS = {
  trigger: /^TRG_[a-z0-9_]+$/,
  checkpoint: /^CHK_[a-z0-9]+$/,
  encounter: /^enc_[a-z0-9_]+$/,
  /** `SPAWN_<encuentro>_<n>`; el spawn del jugador es `SPAWN_player_start_<n>`. */
  spawn: /^SPAWN_(enc_[a-z0-9_]+|player_start)_\d+$/,
  playerSpawn: /^SPAWN_player_start_\d+$/,
  /** `PICK_<item>_<n>`: el tipo repite el `item` completo (ej. `PICK_municion_pistola_1`). */
  pickup: /^PICK_[a-z]+(_[a-z]+)*_\d+$/,
  /** `MRK_<id>`: marcador de objetivo (Empty en Blender, no se renderiza). */
  marker: /^MRK_[a-z0-9_]+$/,
  interactable: /^INT_(note|locked|hold|climb|gate|pickup)_[a-z0-9_]+$/,
  oneway: /^COL_oneway_[a-z0-9_]+$/,
  note: /^note_[a-z0-9_]+$/,
  objective: /^obj_[a-z0-9_]+$/,
  audioCue: /^(sfx|vo|amb|mus)_[a-z0-9_]+$/,
  scenarioSlug: /^[a-z0-9-]+$/,
  hexColor: /^#[0-9A-Fa-f]{6}$/,
} as const;

export const ZONE_IDS = [
  'Z1_Hall',
  'Z2_Plaza',
  'Z3_Frente',
  'Z4_Lateral',
  'Z5_Interior',
  'BG_Skyline',
] as const;

/** Zona de fondo: solo decorado, nunca aloja objetivos, triggers ni encuentros. */
export const BACKGROUND_ZONE = 'BG_Skyline';

export const ZoneIdSchema = z.enum(ZONE_IDS);
export type ZoneId = z.infer<typeof ZoneIdSchema>;

export const TriggerIdSchema = z.string().regex(ID_PATTERNS.trigger);
export const CheckpointIdSchema = z.string().regex(ID_PATTERNS.checkpoint);
export const EncounterIdSchema = z.string().regex(ID_PATTERNS.encounter);
export const SpawnIdSchema = z.string().regex(ID_PATTERNS.spawn);
export const PickupIdSchema = z.string().regex(ID_PATTERNS.pickup);
export const InteractableIdSchema = z.string().regex(ID_PATTERNS.interactable);
export const OnewayIdSchema = z.string().regex(ID_PATTERNS.oneway);
export const NoteIdSchema = z.string().regex(ID_PATTERNS.note);
export const ObjectiveIdSchema = z.string().regex(ID_PATTERNS.objective);
export const AudioCueIdSchema = z.string().regex(ID_PATTERNS.audioCue);

export type TriggerId = z.infer<typeof TriggerIdSchema>;
export type CheckpointId = z.infer<typeof CheckpointIdSchema>;
export type EncounterId = z.infer<typeof EncounterIdSchema>;
export type SpawnId = z.infer<typeof SpawnIdSchema>;
export type PickupId = z.infer<typeof PickupIdSchema>;
export type InteractableId = z.infer<typeof InteractableIdSchema>;
export type OnewayId = z.infer<typeof OnewayIdSchema>;
export type NoteId = z.infer<typeof NoteIdSchema>;
export type ObjectiveId = z.infer<typeof ObjectiveIdSchema>;
export type AudioCueId = z.infer<typeof AudioCueIdSchema>;
