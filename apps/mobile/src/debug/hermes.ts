/** Estadísticas instrumentadas de Hermes (`HermesInternal.getInstrumentedStats`). */
export type HermesStats = Record<string, number>;

interface HermesInternalLike {
  getInstrumentedStats?: () => HermesStats;
}

/** Devuelve las estadísticas de Hermes o `null` si el runtime no las expone (JSC, web). */
export function readHermesStats(): HermesStats | null {
  const internal = (globalThis as { HermesInternal?: HermesInternalLike }).HermesInternal;
  try {
    return internal?.getInstrumentedStats?.() ?? null;
  } catch {
    return null;
  }
}

/** Heap de JS en MB (con un decimal), tomando `js_heapSize` o `js_allocatedBytes`. */
export function readJsHeapMb(stats: HermesStats | null = readHermesStats()): number | null {
  const bytes = stats?.js_heapSize ?? stats?.js_allocatedBytes;
  return typeof bytes === 'number' ? Math.round((bytes / 1048576) * 10) / 10 : null;
}
