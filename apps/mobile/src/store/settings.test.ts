import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  SETTINGS_VERSION,
  createSettingsStore,
  sanitizePersistedSettings,
} from './createSettingsStore.ts';
import { createKeyValueStateStorage, createMemoryKeyValueStore } from './storage.ts';

function readPersisted(store: ReturnType<typeof createMemoryKeyValueStore>): unknown {
  const raw = store.getString(SETTINGS_STORAGE_KEY);
  return raw === undefined ? undefined : JSON.parse(raw);
}

describe('settings store', () => {
  it('starts with the defaults when nothing is persisted', () => {
    const kv = createMemoryKeyValueStore();
    const useSettings = createSettingsStore(createKeyValueStateStorage(kv));
    expect(useSettings.getState()).toMatchObject(DEFAULT_SETTINGS);
  });

  it('persists only the settings fields, with a version', () => {
    const kv = createMemoryKeyValueStore();
    const useSettings = createSettingsStore(createKeyValueStateStorage(kv));
    useSettings.getState().setRenderBackend('webgl');
    useSettings.getState().setQuality('high');
    useSettings.getState().setDebugOverlay(false);

    expect(readPersisted(kv)).toEqual({
      state: { renderBackend: 'webgl', quality: 'high', debugOverlay: false },
      version: SETTINGS_VERSION,
    });
  });

  it('rehydrates from storage in a new store instance', () => {
    const kv = createMemoryKeyValueStore();
    createSettingsStore(createKeyValueStateStorage(kv)).getState().setRenderBackend('webgl');

    const rehydrated = createSettingsStore(createKeyValueStateStorage(kv));
    expect(rehydrated.getState().renderBackend).toBe('webgl');
    expect(rehydrated.getState().quality).toBe(DEFAULT_SETTINGS.quality);
  });

  it('ignores corrupt or unknown persisted values', () => {
    const kv = createMemoryKeyValueStore();
    kv.set(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        state: { renderBackend: 'metal', quality: 'ultra', debugOverlay: 'yes', extra: 1 },
        version: SETTINGS_VERSION,
      }),
    );
    const useSettings = createSettingsStore(createKeyValueStateStorage(kv));
    expect(useSettings.getState()).toMatchObject(DEFAULT_SETTINGS);
    expect('extra' in useSettings.getState()).toBe(false);
  });

  it('reset restores the defaults and persists them', () => {
    const kv = createMemoryKeyValueStore();
    const useSettings = createSettingsStore(createKeyValueStateStorage(kv));
    useSettings.getState().setQuality('low');
    useSettings.getState().reset();
    expect(useSettings.getState().quality).toBe(DEFAULT_SETTINGS.quality);
    expect(readPersisted(kv)).toMatchObject({ state: DEFAULT_SETTINGS });
  });
});

describe('sanitizePersistedSettings', () => {
  it('keeps valid fields and defaults the rest', () => {
    expect(sanitizePersistedSettings({ quality: 'low' })).toEqual({
      ...DEFAULT_SETTINGS,
      quality: 'low',
    });
    expect(sanitizePersistedSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizePersistedSettings('nope')).toEqual(DEFAULT_SETTINGS);
  });
});
