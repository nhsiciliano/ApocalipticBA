import type { AudioCueId } from '@apocalipticba/shared';

import type { AudioAdapter, AudioPlayOptions } from './audio';
import type { HapticImpact, HapticNotification, HapticsAdapter } from './haptics';
import { createNeutralIntent, type InputAdapter, type PlayerIntent } from './input';
import type { StorageAdapter } from './storage';

type PulseKey = 'interact' | 'flashlightToggle' | 'jump';

/** Input guionado: `set` fija estado mantenido; `press` activa un flanco solo para el próximo `sample`. */
export interface ScriptedInputAdapter extends InputAdapter {
  set(intent: Partial<PlayerIntent>): void;
  press(key: PulseKey): void;
  /** Vuelve al intent neutro. */
  clear(): void;
}

/** Storage en memoria; serializa con JSON como lo haría un storage real. */
export interface MemoryStorageAdapter extends StorageAdapter {
  readonly data: ReadonlyMap<string, string>;
  readonly saves: readonly { key: string; data: unknown }[];
}

export interface RecordingHapticsAdapter extends HapticsAdapter {
  readonly calls: readonly (HapticImpact | HapticNotification)[];
}

export interface RecordingAudioAdapter extends AudioAdapter {
  readonly calls: readonly {
    op: 'play' | 'stop' | 'ambient';
    cueId: AudioCueId | null;
    loop?: boolean;
  }[];
}

export interface NullAdapters {
  input: ScriptedInputAdapter;
  storage: MemoryStorageAdapter;
  haptics: RecordingHapticsAdapter;
  audio: RecordingAudioAdapter;
}

/** Adaptadores sin plataforma, para tests y herramientas en Node. Graban lo que reciben. */
export function createNullAdapters(): NullAdapters {
  return {
    input: createScriptedInput(),
    storage: createMemoryStorage(),
    haptics: createRecordingHaptics(),
    audio: createRecordingAudio(),
  };
}

function createScriptedInput(): ScriptedInputAdapter {
  let held = createNeutralIntent();
  const pulses = new Set<PulseKey>();
  return {
    sample() {
      const intent = { ...held };
      for (const key of pulses) intent[key] = true;
      pulses.clear();
      return intent;
    },
    set(intent) {
      held = { ...held, ...intent };
    },
    press(key) {
      pulses.add(key);
    },
    clear() {
      held = createNeutralIntent();
      pulses.clear();
    },
  };
}

function createMemoryStorage(): MemoryStorageAdapter {
  const data = new Map<string, string>();
  const saves: { key: string; data: unknown }[] = [];
  return {
    data,
    saves,
    save(key, value) {
      const json = JSON.stringify(value);
      data.set(key, json);
      saves.push({ key, data: JSON.parse(json) as unknown });
      return Promise.resolve();
    },
    load<T>(key: string) {
      const json = data.get(key);
      return Promise.resolve(json === undefined ? null : (JSON.parse(json) as T));
    },
    remove(key) {
      data.delete(key);
      return Promise.resolve();
    },
  };
}

function createRecordingHaptics(): RecordingHapticsAdapter {
  const calls: (HapticImpact | HapticNotification)[] = [];
  return {
    calls,
    impact(kind) {
      calls.push(kind);
    },
    notification(kind) {
      calls.push(kind);
    },
  };
}

function createRecordingAudio(): RecordingAudioAdapter {
  const calls: { op: 'play' | 'stop' | 'ambient'; cueId: AudioCueId | null; loop?: boolean }[] = [];
  return {
    calls,
    play(cueId, options?: AudioPlayOptions) {
      calls.push({ op: 'play', cueId, loop: options?.loop ?? false });
    },
    stop(cueId) {
      calls.push({ op: 'stop', cueId });
    },
    setAmbient(cueId) {
      calls.push({ op: 'ambient', cueId });
    },
  };
}
