/** Persistencia clave → valor serializable (MMKV o expo-sqlite en el host). */
export interface StorageAdapter {
  save(key: string, data: unknown): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
}
