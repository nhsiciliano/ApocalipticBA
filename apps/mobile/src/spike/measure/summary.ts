import { percentile } from '../../render/stats.ts';

export interface RunCounters {
  drawCalls: number;
  triangles: number;
}

/** Resumen de una corrida de medición (todas las duraciones en ms). */
export interface RunSummary {
  frames: number;
  durationMs: number;
  fpsAvg: number;
  /** fps equivalente al p99 del frame time: el "p1 fps" de las tablas. */
  fpsP1: number;
  frameTimeAvgMs: number;
  frameTimeP50Ms: number;
  frameTimeP99Ms: number;
  frameTimeMaxMs: number;
  drawCalls: number;
  triangles: number;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Resume los deltas (ms) de una corrida. Puro: se prueba en Node. */
export function summarizeRun(deltasMs: readonly number[], counters: RunCounters): RunSummary {
  const frames = deltasMs.length;
  const durationMs = deltasMs.reduce((sum, delta) => sum + delta, 0);
  const p99 = percentile(deltasMs, 0.99);
  return {
    frames,
    durationMs: Math.round(durationMs),
    fpsAvg: durationMs > 0 ? round1((frames * 1000) / durationMs) : 0,
    fpsP1: p99 > 0 ? round1(1000 / p99) : 0,
    frameTimeAvgMs: frames > 0 ? round1(durationMs / frames) : 0,
    frameTimeP50Ms: round1(percentile(deltasMs, 0.5)),
    frameTimeP99Ms: round1(p99),
    frameTimeMaxMs: round1(Math.max(0, ...deltasMs)),
    drawCalls: counters.drawCalls,
    triangles: counters.triangles,
  };
}

/**
 * Acumula deltas hasta completar `durationMs` y después entrega el resumen. Mutable y sin React:
 * se llama desde `useFrame` sin pasar por el estado.
 */
export class RunRecorder {
  private readonly deltas: number[] = [];
  private elapsedMs = 0;

  constructor(readonly durationMs: number) {}

  /** Devuelve el resumen cuando la corrida se completa; antes, `null`. */
  tick(deltaMs: number, counters: RunCounters): RunSummary | null {
    this.deltas.push(deltaMs);
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < this.durationMs) return null;
    return summarizeRun(this.deltas, counters);
  }
}
