import { QUALITY_LEVELS, type QualityLevel } from '@apocalipticba/shared/constants';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { DEFAULT_RENDER_BACKEND, isRenderBackend, type RenderBackend } from '../render/backend.ts';

export const SETTINGS_STORAGE_KEY = 'apocalipticba.settings';
export const SETTINGS_VERSION = 1;

export interface PersistedSettings {
  renderBackend: RenderBackend;
  quality: QualityLevel;
  debugOverlay: boolean;
}

export interface SettingsState extends PersistedSettings {
  setRenderBackend: (backend: RenderBackend) => void;
  setQuality: (quality: QualityLevel) => void;
  setDebugOverlay: (enabled: boolean) => void;
  reset: () => void;
}

export const DEFAULT_SETTINGS: PersistedSettings = {
  renderBackend: DEFAULT_RENDER_BACKEND,
  quality: 'medium',
  debugOverlay: true,
};

export function isQualityLevel(value: unknown): value is QualityLevel {
  return typeof value === 'string' && value in QUALITY_LEVELS;
}

/** Toma solo los campos válidos de lo persistido; lo demás vuelve al default. */
export function sanitizePersistedSettings(persisted: unknown): PersistedSettings {
  const source = typeof persisted === 'object' && persisted !== null ? persisted : {};
  const { renderBackend, quality, debugOverlay } = source as Partial<Record<string, unknown>>;
  return {
    renderBackend: isRenderBackend(renderBackend) ? renderBackend : DEFAULT_SETTINGS.renderBackend,
    quality: isQualityLevel(quality) ? quality : DEFAULT_SETTINGS.quality,
    debugOverlay: typeof debugOverlay === 'boolean' ? debugOverlay : DEFAULT_SETTINGS.debugOverlay,
  };
}

/**
 * Crea el store de ajustes persistido en `storage`. La app lo instancia con MMKV
 * (`settings.ts`); los tests, con un store en memoria.
 */
export function createSettingsStore(storage: StateStorage) {
  return create<SettingsState>()(
    persist(
      (set) => ({
        ...DEFAULT_SETTINGS,
        setRenderBackend: (renderBackend) => set({ renderBackend }),
        setQuality: (quality) => set({ quality }),
        setDebugOverlay: (debugOverlay) => set({ debugOverlay }),
        reset: () => set({ ...DEFAULT_SETTINGS }),
      }),
      {
        name: SETTINGS_STORAGE_KEY,
        version: SETTINGS_VERSION,
        storage: createJSONStorage(() => storage),
        partialize: ({ renderBackend, quality, debugOverlay }) => ({
          renderBackend,
          quality,
          debugOverlay,
        }),
        merge: (persisted, current) => ({ ...current, ...sanitizePersistedSettings(persisted) }),
      },
    ),
  );
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
