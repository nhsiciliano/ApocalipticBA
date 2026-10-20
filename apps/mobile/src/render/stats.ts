import { create } from 'zustand';

/** Métricas del frame que muestra el overlay de debug. Las alimenta `StatsSampler`. */
export interface RenderStats {
  fps: number;
  /** Promedio del delta entre frames en la última ventana, en ms. */
  frameTimeMs: number;
  /** Percentil 99 del frame time sobre los últimos `RECENT_FRAMES` frames (el 1 % peor). */
  frameTimeP99Ms: number;
  /** fps equivalente al p99 del frame time ("p1 fps"). */
  fpsP1: number;
  drawCalls: number;
  triangles: number;
  /** Frames contados desde que se montó el canvas. */
  frames: number;
  /** Heap de Hermes en MB, si el runtime lo expone. */
  jsHeapMb: number | null;
}

export const EMPTY_RENDER_STATS: RenderStats = {
  fps: 0,
  frameTimeMs: 0,
  frameTimeP99Ms: 0,
  fpsP1: 0,
  drawCalls: 0,
  triangles: 0,
  frames: 0,
  jsHeapMb: null,
};

interface RenderStatsStore extends RenderStats {
  update: (stats: RenderStats) => void;
  reset: () => void;
}

export const useRenderStats = create<RenderStatsStore>()((set) => ({
  ...EMPTY_RENDER_STATS,
  update: (stats) => set(stats),
  reset: () => set({ ...EMPTY_RENDER_STATS }),
}));

/** Ventana de muestreo del overlay: suficiente para leerlo sin que parpadee. */
export const STATS_WINDOW_MS = 500;
/** Frames que se retienen para el percentil (unos 4 s a 60 fps). */
export const RECENT_FRAMES = 240;

export interface StatsAccumulator {
  frames: number;
  elapsedMs: number;
  totalFrames: number;
  /** Últimos deltas, en ms, para el percentil. */
  recent: number[];
}

export function createStatsAccumulator(): StatsAccumulator {
  return { frames: 0, elapsedMs: 0, totalFrames: 0, recent: [] };
}

/**
 * Percentil por rango más cercano (`p` en [0, 1]) sobre una copia ordenada. Devuelve 0 si no
 * hay valores.
 */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[rank] ?? 0;
}

/**
 * Suma un frame y, si la ventana se completó, devuelve las métricas listas para publicar
 * (y reinicia la ventana). Puro: se prueba en Node.
 */
export function accumulateFrame(
  acc: StatsAccumulator,
  deltaMs: number,
  counters: { drawCalls: number; triangles: number },
  windowMs = STATS_WINDOW_MS,
): RenderStats | null {
  acc.frames += 1;
  acc.totalFrames += 1;
  acc.elapsedMs += deltaMs;
  acc.recent.push(deltaMs);
  if (acc.recent.length > RECENT_FRAMES) acc.recent.splice(0, acc.recent.length - RECENT_FRAMES);
  if (acc.elapsedMs < windowMs) return null;

  const p99 = percentile(acc.recent, 0.99);
  const stats: RenderStats = {
    fps: Math.round((acc.frames * 1000) / acc.elapsedMs),
    frameTimeMs: Math.round((acc.elapsedMs / acc.frames) * 10) / 10,
    frameTimeP99Ms: Math.round(p99 * 10) / 10,
    fpsP1: p99 > 0 ? Math.round(1000 / p99) : 0,
    drawCalls: counters.drawCalls,
    triangles: counters.triangles,
    frames: acc.totalFrames,
    jsHeapMb: null,
  };
  acc.frames = 0;
  acc.elapsedMs = 0;
  return stats;
}
