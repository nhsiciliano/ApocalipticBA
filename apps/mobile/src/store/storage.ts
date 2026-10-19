import type { StateStorage } from 'zustand/middleware';

/**
 * Subconjunto de la API de `MMKV` (react-native-mmkv 4) que necesita `persist` de Zustand.
 * Se tipa aparte para poder probar el store en Node con una implementación en memoria.
 */
export interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): unknown;
}

/** Adapta un `KeyValueStore` síncrono al `StateStorage` que espera `createJSONStorage`. */
export function createKeyValueStateStorage(store: KeyValueStore): StateStorage {
  return {
    getItem: (name) => store.getString(name) ?? null,
    setItem: (name, value) => {
      store.set(name, value);
    },
    removeItem: (name) => {
      store.remove(name);
    },
  };
}

/** Implementación en memoria para tests y para correr sin módulo nativo. */
export function createMemoryKeyValueStore(): KeyValueStore & { readonly size: number } {
  const map = new Map<string, string>();
  return {
    getString: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => map.delete(key),
    get size() {
      return map.size;
    },
  };
}
