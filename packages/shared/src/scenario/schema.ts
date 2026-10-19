import { z } from 'zod';

import {
  AudioCueIdSchema,
  CheckpointIdSchema,
  EncounterIdSchema,
  ID_PATTERNS,
  InteractableIdSchema,
  NoteIdSchema,
  ObjectiveIdSchema,
  OnewayIdSchema,
  PickupIdSchema,
  SpawnIdSchema,
  TriggerIdSchema,
  ZoneIdSchema,
} from './ids.ts';
import { checkScenarioIntegrity } from './integrity.ts';

export const LocalizedTextSchema = z.strictObject({
  'es-AR': z.string().min(1),
  en: z.string().min(1).optional(),
});
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3Schema>;

export const ZoneSchema = z.strictObject({
  id: ZoneIdSchema,
  name: LocalizedTextSchema,
  /** Archivo glTF de la zona, relativo a `packages/assets/dist/levels/`. */
  file: z.string().endsWith('.gltf'),
  fogColor: z.string().regex(ID_PATTERNS.hexColor),
  preload: z.array(ZoneIdSchema).default([]),
});
export type Zone = z.infer<typeof ZoneSchema>;

export const ObjectiveSchema = z.strictObject({
  id: ObjectiveIdSchema,
  zone: ZoneIdSchema,
  text: LocalizedTextSchema,
  /** Nodo glTF (`MRK_<id>`) donde el HUD muestra el marcador. */
  markerNode: z.string().regex(ID_PATTERNS.marker).optional(),
});
export type Objective = z.infer<typeof ObjectiveSchema>;

/** Acciones que pueden disparar triggers, encuentros e interactuables. */
export const ActionSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('objective.advance'), objectiveId: ObjectiveIdSchema }),
  z.strictObject({ type: z.literal('objective.complete'), objectiveId: ObjectiveIdSchema }),
  z.strictObject({ type: z.literal('encounter.start'), encounterId: EncounterIdSchema }),
  z.strictObject({ type: z.literal('checkpoint.save'), checkpointId: CheckpointIdSchema }),
  z.strictObject({
    type: z.literal('audio.play'),
    cueId: AudioCueIdSchema,
    loop: z.boolean().optional(),
  }),
  z.strictObject({
    type: z.literal('text.show'),
    text: LocalizedTextSchema,
    durationMs: z.int().positive(),
  }),
  z.strictObject({ type: z.literal('zone.unload'), zones: z.array(ZoneIdSchema) }),
  z.strictObject({ type: z.literal('zone.preload'), zones: z.array(ZoneIdSchema) }),
  z.strictObject({ type: z.literal('flag.set'), flag: z.string().min(1), value: z.boolean() }),
]);
export type Action = z.infer<typeof ActionSchema>;

export const TriggerSchema = z.strictObject({
  id: TriggerIdSchema,
  zone: ZoneIdSchema,
  once: z.boolean().default(true),
  actions: z.array(ActionSchema).min(1),
  requiresFlags: z.array(z.string().min(1)).optional(),
});
export type Trigger = z.infer<typeof TriggerSchema>;

export const EncounterWaveSchema = z
  .strictObject({
    composition: z.strictObject({
      comun: z.int().min(0),
      corredor: z.int().min(0),
    }),
    spawnIds: z.array(SpawnIdSchema).min(1),
    delayMs: z.int().min(0).default(0),
  })
  .refine((wave) => wave.composition.comun + wave.composition.corredor > 0, {
    path: ['composition'],
    message: 'A wave needs at least one zombie (comun or corredor > 0)',
  });
export type EncounterWave = z.infer<typeof EncounterWaveSchema>;

export const EncounterSchema = z
  .strictObject({
    id: EncounterIdSchema,
    zone: ZoneIdSchema,
    waves: z.array(EncounterWaveSchema).min(1),
    endCondition: z.enum(['all_dead', 'timer']),
    timerMs: z.int().positive().optional(),
    onEnd: z.array(ActionSchema).default([]),
  })
  .refine((encounter) => encounter.endCondition !== 'timer' || encounter.timerMs !== undefined, {
    path: ['timerMs'],
    message: 'timerMs is required when endCondition is "timer"',
  });
export type Encounter = z.infer<typeof EncounterSchema>;

export const CheckpointSchema = z.strictObject({
  id: CheckpointIdSchema,
  zone: ZoneIdSchema,
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;

export const NoteSchema = z.strictObject({
  id: NoteIdSchema,
  title: LocalizedTextSchema,
  body: LocalizedTextSchema,
  voiceCueId: AudioCueIdSchema.optional(),
});
export type Note = z.infer<typeof NoteSchema>;

export const PICKUP_ITEMS = [
  'pistola',
  'escopeta',
  'botiquin',
  'municion_pistola',
  'municion_escopeta',
  'linterna',
] as const;
export const PickupItemSchema = z.enum(PICKUP_ITEMS);
export type PickupItem = z.infer<typeof PickupItemSchema>;

export const PickupSchema = z
  .strictObject({
    id: PickupIdSchema,
    zone: ZoneIdSchema,
    item: PickupItemSchema,
    amount: z.int().min(1).default(1),
  })
  .refine((pickup) => pickup.id.slice('PICK_'.length, pickup.id.lastIndexOf('_')) === pickup.item, {
    path: ['id'],
    message: 'Pickup id type (PICK_<item>_<n>) must match its item',
  });
export type Pickup = z.infer<typeof PickupSchema>;

const interactableBase = {
  id: InteractableIdSchema,
  zone: ZoneIdSchema,
  prompt: LocalizedTextSchema,
};

export const InteractableSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      ...interactableBase,
      kind: z.literal('note'),
      noteId: NoteIdSchema,
      onRead: z.array(ActionSchema).default([]),
    }),
    z.strictObject({
      ...interactableBase,
      kind: z.literal('locked'),
      message: LocalizedTextSchema,
    }),
    z.strictObject({
      ...interactableBase,
      kind: z.literal('hold'),
      durationMs: z.int().positive(),
      /** El progreso se conserva al soltar (la puerta "Forzar" no se reinicia). */
      accumulative: z.boolean().default(true),
      onStart: z.array(ActionSchema).default([]),
      onComplete: z.array(ActionSchema).min(1),
    }),
    z.strictObject({
      ...interactableBase,
      kind: z.literal('climb'),
      /** Secuencia guionada de posiciones, en metros, en el espacio de la zona. */
      path: z.array(Vec3Schema).min(2),
      durationMs: z.int().positive(),
      onComplete: z.array(ActionSchema).default([]),
    }),
    z.strictObject({
      ...interactableBase,
      kind: z.literal('gate'),
      requiresItems: z.array(PickupItemSchema).min(1),
      lockedMessage: LocalizedTextSchema,
      onOpen: z.array(ActionSchema).default([]),
    }),
    z.strictObject({
      ...interactableBase,
      kind: z.literal('pickup'),
      pickupId: PickupIdSchema,
    }),
  ])
  .refine((interactable) => interactable.id.startsWith(`INT_${interactable.kind}_`), {
    path: ['id'],
    message: 'Interactable id prefix (INT_<kind>_) must match its kind',
  });
export type Interactable = z.infer<typeof InteractableSchema>;

export const OnewaySchema = z.strictObject({
  id: OnewayIdSchema,
  zone: ZoneIdSchema,
  /** Zonas que se descargan al cruzar el bloqueo de un solo sentido. */
  unloadZones: z.array(ZoneIdSchema).min(1),
});
export type Oneway = z.infer<typeof OnewaySchema>;

/** Forma del escenario sin los chequeos cruzados; usala solo para derivar tipos. */
export const ScenarioBaseSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: z.string().regex(ID_PATTERNS.scenarioSlug),
  name: LocalizedTextSchema,
  order: z.int().min(1),
  start: z.strictObject({
    zone: ZoneIdSchema,
    spawnId: SpawnIdSchema,
  }),
  zones: z.array(ZoneSchema).min(1),
  objectives: z.array(ObjectiveSchema).min(1),
  triggers: z.array(TriggerSchema).default([]),
  encounters: z.array(EncounterSchema).default([]),
  checkpoints: z.array(CheckpointSchema).default([]),
  notes: z.array(NoteSchema).default([]),
  pickups: z.array(PickupSchema).default([]),
  interactables: z.array(InteractableSchema).default([]),
  oneways: z.array(OnewaySchema).default([]),
});
export type ScenarioBase = z.infer<typeof ScenarioBaseSchema>;

/** Esquema completo de `scenario.json`: forma + ids únicos + referencias cruzadas. */
export const ScenarioSchema = ScenarioBaseSchema.superRefine(checkScenarioIntegrity);
export type Scenario = z.infer<typeof ScenarioSchema>;
export type ScenarioInput = z.input<typeof ScenarioSchema>;

/** Parsea un `scenario.json`; lanza `ZodError` con el `path` del campo que falla. */
export function parseScenario(json: unknown): Scenario {
  return ScenarioSchema.parse(json);
}

export function safeParseScenario(json: unknown) {
  return ScenarioSchema.safeParse(json);
}
