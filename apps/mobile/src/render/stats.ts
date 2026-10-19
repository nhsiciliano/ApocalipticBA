import { create } from 'zustand';

/** Métricas del frame que muestra el overlay de debug. Las alimenta `StatsSampler`. */
export interface RenderStats {
  fps: number;
  /** Promedio del delta entre frames en la última ventana, en ms. */
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  /** Frames contados desde que se montó el canvas. */
  frames: number;
}

export const EMPTY_RENDER_STATS: RenderStats = {
  fps: 0,
  frameTimeMs: 0,
  drawCalls: 0,
  triangles: 0,
  frames: 0,
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

export interface StatsAccumulator {
  frames: number;
  elapsedMs: number;
  totalFrames: number;
}

export function createStatsAccumulator(): StatsAccumulator {
  return { frames: 0, elapsedMs: 0, totalFrames: 0 };
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
  if (acc.elapsedMs < windowMs) return null;

  const stats: RenderStats = {
    fps: Math.round((acc.frames * 1000) / acc.elapsedMs),
    frameTimeMs: Math.round((acc.elapsedMs / acc.frames) * 10) / 10,
    drawCalls: counters.drawCalls,
    triangles: counters.triangles,
    frames: acc.totalFrames,
  };
  acc.frames = 0;
  acc.elapsedMs = 0;
  return stats;
}
