import type { AudioCueId, Interactable } from '@apocalipticba/shared';

import { startClimb } from './climb';
import { collectPickup, hasItem } from './inventory';
import { runActions } from '../actions/run-actions';
import type { PlayerIntent } from '../adapters/input';
import type { InteractableKind } from '../events/game-events';
import { playerHeight, setPhase, type GameContext } from '../game/context';
import { distanceToVerticalSegment } from '../math/vec3';

type HoldDef = Extract<Interactable, { kind: 'hold' }>;
type NoteInteractable = Extract<Interactable, { kind: 'note' }>;

/** Tolerancia para cerrar el progreso pese al redondeo de sumar `dt`. */
const PROGRESS_EPSILON = 1e-9;

export interface InteractionCurrent {
  id: string;
  kind: InteractableKind;
  /** Solo las interacciones sostenidas avanzan; el resto queda en 0. */
  progress: number;
}

/**
 * El host informa qué interactuable tiene delante (raycast o proximidad); el core decide si es un
 * candidato válido: existe en el escenario, su zona está registrada, está en rango
 * (`interactRange` desde el eje de la cápsula), sigue disponible y el jugador está en `playing`.
 */
export function setCandidate(ctx: GameContext, id: string | null): void {
  if (id !== null && !ctx.index.interactables.has(id)) {
    ctx.warn(`setCandidate("${id}"): unknown interactable`);
  }
  ctx.run.requestedCandidate = id;
  refreshCandidate(ctx);
}

export function currentInteraction(ctx: GameContext): InteractionCurrent | null {
  const id = ctx.run.candidate;
  const def = id === null ? undefined : ctx.index.interactables.get(id);
  if (id === null || def === undefined) return null;
  return { id, kind: def.kind, progress: ctx.run.holds.get(id)?.progress ?? 0 };
}

function isAvailable(ctx: GameContext, def: Interactable): boolean {
  switch (def.kind) {
    case 'gate':
      return !ctx.run.openedGates.has(def.id);
    case 'hold':
      return !ctx.run.completedHolds.has(def.id);
    case 'pickup':
      return !ctx.run.consumedPickups.has(def.pickupId);
    case 'note':
    case 'locked':
    case 'climb':
      return true;
  }
}

function validCandidate(ctx: GameContext): string | null {
  const id = ctx.run.requestedCandidate;
  if (id === null || ctx.run.phase !== 'playing') return null;
  for (const entity of ctx.ecs.interactables) {
    if (entity.node.id !== id) continue;
    const def = entity.interactable.def;
    if (!isAvailable(ctx, def)) return null;
    const reach = distanceToVerticalSegment(
      entity.node.position,
      ctx.player.transform.position,
      playerHeight(ctx),
    );
    return reach <= ctx.settings.interactRange ? id : null;
  }
  return null;
}

/** Recalcula el candidato y emite `interact.prompt` solo si cambió. */
export function refreshCandidate(ctx: GameContext): void {
  const next = validCandidate(ctx);
  if (next === ctx.run.candidate) return;
  ctx.run.candidate = next;
  const def = next === null ? undefined : ctx.index.interactables.get(next);
  ctx.events.emit(
    'interact.prompt',
    next === null || def === undefined
      ? null
      : { id: next, prompt: ctx.text(def.prompt), kind: def.kind },
  );
}

export function interactionSystem(ctx: GameContext, intent: PlayerIntent, dt: number): void {
  if (ctx.run.phase === 'reading_note') {
    if (intent.interact) closeNote(ctx);
    refreshCandidate(ctx);
    return;
  }

  refreshCandidate(ctx);
  if (ctx.run.phase !== 'playing') {
    releaseHolds(ctx, null);
    return;
  }

  const id = ctx.run.candidate;
  const def = id === null ? undefined : ctx.index.interactables.get(id);
  const heldHold = def?.kind === 'hold' && intent.interactHeld ? def : null;
  releaseHolds(ctx, heldHold?.id ?? null);

  if (heldHold !== null) {
    advanceHold(ctx, heldHold, dt);
  } else if (def !== undefined && intent.interact) {
    activate(ctx, def);
  }
  refreshCandidate(ctx);
}

function activate(ctx: GameContext, def: Interactable): void {
  switch (def.kind) {
    case 'note':
      openNote(ctx, def);
      break;
    case 'locked':
      ctx.events.emit('interact.locked', { id: def.id, message: ctx.text(def.message) });
      ctx.haptics?.notification('warning');
      break;
    case 'gate':
      if (def.requiresItems.every((item) => hasItem(ctx, item))) {
        ctx.run.openedGates.add(def.id);
        ctx.events.emit('interact.completed', { id: def.id });
        ctx.haptics?.notification('success');
        runActions(ctx, def.onOpen);
      } else {
        ctx.events.emit('interact.locked', { id: def.id, message: ctx.text(def.lockedMessage) });
        ctx.haptics?.notification('warning');
      }
      break;
    case 'pickup': {
      const pickup = ctx.index.pickups.get(def.pickupId);
      if (pickup !== undefined && collectPickup(ctx, pickup)) {
        ctx.events.emit('interact.completed', { id: def.id });
      }
      break;
    }
    case 'climb':
      startClimb(ctx, def);
      break;
    case 'hold':
      // Se maneja con `interactHeld` en `advanceHold`.
      break;
  }
}

/** Las sostenidas no acumulativas vuelven a 0 al soltar o al cambiar de candidato. */
function releaseHolds(ctx: GameContext, heldId: string | null): void {
  for (const [id, state] of ctx.run.holds) {
    if (id === heldId || state.progress === 0 || ctx.run.completedHolds.has(id)) continue;
    const def = ctx.index.interactables.get(id);
    if (def?.kind !== 'hold' || def.accumulative) continue;
    state.progress = 0;
    ctx.events.emit('interact.progress', { id, progress: 0 });
  }
}

function advanceHold(ctx: GameContext, def: HoldDef, dt: number): void {
  let state = ctx.run.holds.get(def.id);
  if (state === undefined) {
    state = { progress: 0, started: false };
    ctx.run.holds.set(def.id, state);
  }
  if (!state.started) {
    state.started = true;
    runActions(ctx, def.onStart);
  }

  const previous = state.progress;
  let progress = Math.min(1, previous + (dt * 1000) / def.durationMs);
  if (progress >= 1 - PROGRESS_EPSILON) progress = 1;
  state.progress = progress;
  if (progress !== previous) ctx.events.emit('interact.progress', { id: def.id, progress });
  if (progress < 1) return;

  ctx.run.completedHolds.add(def.id);
  for (const cue of loopingCues(def)) ctx.audio?.stop(cue);
  ctx.events.emit('interact.completed', { id: def.id });
  ctx.haptics?.notification('success');
  runActions(ctx, def.onComplete);
}

/** Los loops que arrancó `onStart` (el ruido de forzar la puerta) se cortan al completar. */
function loopingCues(def: HoldDef): AudioCueId[] {
  return def.onStart.flatMap((action) =>
    action.type === 'audio.play' && action.loop === true ? [action.cueId] : [],
  );
}

function openNote(ctx: GameContext, def: NoteInteractable): void {
  const note = ctx.index.notes.get(def.noteId);
  if (note === undefined) return;
  ctx.run.openNote = { interactableId: def.id, noteId: note.id };
  setPhase(ctx, 'reading_note');
  ctx.events.emit('note.opened', {
    noteId: note.id,
    title: ctx.text(note.title),
    body: ctx.text(note.body),
  });
  if (note.voiceCueId !== undefined) {
    ctx.audio?.play(note.voiceCueId, { loop: false });
    ctx.events.emit('audio.play', { cueId: note.voiceCueId, loop: false });
  }
}

/**
 * Cierra la nota abierta. La primera lectura de cada nota la registra como encontrada y ejecuta su
 * `onRead`; releerla no repite las acciones. La voz en off se corta al cerrar.
 */
export function closeNote(ctx: GameContext): void {
  const open = ctx.run.openNote;
  if (open === null) return;
  ctx.run.openNote = null;

  const note = ctx.index.notes.get(open.noteId);
  if (note?.voiceCueId !== undefined) ctx.audio?.stop(note.voiceCueId);
  ctx.events.emit('note.closed', { noteId: open.noteId });
  setPhase(ctx, 'playing');

  if (ctx.run.notesFound.has(open.noteId)) return;
  ctx.run.notesFound.add(open.noteId);
  const def = ctx.index.interactables.get(open.interactableId);
  if (def?.kind === 'note') runActions(ctx, def.onRead);
}
