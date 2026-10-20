import { create } from 'zustand';

import type { RunSummary } from './summary.ts';

export type RunStatus = 'idle' | 'running' | 'done';

interface SpikeRunState {
  status: RunStatus;
  durationMs: number;
  /** Identificador de la corrida (para que `SpikeRecorder` reinicie al pedir otra). */
  runId: number;
  summary: RunSummary | null;
  start: (durationMs: number) => void;
  finish: (summary: RunSummary) => void;
  reset: () => void;
}

/** Estado de la corrida de medición del spike; los deltas viven en `RunRecorder`, no acá. */
export const useSpikeRun = create<SpikeRunState>()((set) => ({
  status: 'idle',
  durationMs: 0,
  runId: 0,
  summary: null,
  start: (durationMs) =>
    set((state) => ({ status: 'running', durationMs, runId: state.runId + 1, summary: null })),
  finish: (summary) => set({ status: 'done', summary }),
  reset: () => set({ status: 'idle', summary: null }),
}));
