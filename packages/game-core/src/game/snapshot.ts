import {
  PICKUP_ITEMS,
  type CheckpointId,
  type NoteId,
  type PickupItem,
  type Scenario,
} from '@apocalipticba/shared';

import { isFiniteVec3, type Vec3 } from '../math/vec3';

/** Estado serializable de un checkpoint. Es lo que se guarda en `save:<scenarioId>`. */
export interface CheckpointSnapshot {
  version: 1;
  scenarioId: string;
  checkpointId: CheckpointId;
  position: Vec3;
  yaw: number;
  health: number;
  inventory: [PickupItem, number][];
  flags: string[];
  objectiveIndex: number;
  consumedPickups: string[];
  crossedOneways: string[];
  openedGates: string[];
  completedHolds: string[];
  /** Triggers `once` ya disparados (si no, reaparecer dentro de uno lo volvería a disparar). */
  firedTriggers: string[];
  notesFound: NoteId[];
  elapsedMs: number;
}

/** Punto de reaparición interno: el inicio del escenario no tiene checkpoint. */
export type RestorePoint = Omit<CheckpointSnapshot, 'checkpointId'> & {
  checkpointId: CheckpointId | null;
};

const ITEMS = new Set<string>(PICKUP_ITEMS);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Valida un snapshot leído del storage contra el escenario. Devuelve `null` con el motivo si es de
 * otra versión, de otro escenario o está corrupto.
 */
export function parseSnapshot(
  data: unknown,
  scenario: Scenario,
): { ok: true; snapshot: CheckpointSnapshot } | { ok: false; reason: string } {
  if (typeof data !== 'object' || data === null) return { ok: false, reason: 'not an object' };
  const s = data as Record<string, unknown>;
  if (s.version !== 1) return { ok: false, reason: `unsupported version ${String(s.version)}` };
  if (s.scenarioId !== scenario.id) {
    return { ok: false, reason: `scenario mismatch (${String(s.scenarioId)})` };
  }
  if (!scenario.checkpoints.some((checkpoint) => checkpoint.id === s.checkpointId)) {
    return { ok: false, reason: `unknown checkpoint ${String(s.checkpointId)}` };
  }
  if (!isFiniteVec3(s.position)) return { ok: false, reason: 'invalid position' };
  for (const key of ['yaw', 'health', 'objectiveIndex', 'elapsedMs'] as const) {
    if (typeof s[key] !== 'number' || !Number.isFinite(s[key])) {
      return { ok: false, reason: `invalid ${key}` };
    }
  }
  const objectiveIndex = s.objectiveIndex as number;
  if (
    !Number.isInteger(objectiveIndex) ||
    objectiveIndex < 0 ||
    objectiveIndex > scenario.objectives.length
  ) {
    return { ok: false, reason: 'invalid objectiveIndex' };
  }
  const inventoryOk =
    Array.isArray(s.inventory) &&
    s.inventory.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === 'string' &&
        ITEMS.has(entry[0]) &&
        typeof entry[1] === 'number' &&
        Number.isFinite(entry[1]),
    );
  if (!inventoryOk) return { ok: false, reason: 'invalid inventory' };
  for (const key of [
    'flags',
    'consumedPickups',
    'crossedOneways',
    'openedGates',
    'completedHolds',
    'firedTriggers',
    'notesFound',
  ] as const) {
    if (!isStringArray(s[key])) return { ok: false, reason: `invalid ${key}` };
  }
  return { ok: true, snapshot: s as unknown as CheckpointSnapshot };
}
