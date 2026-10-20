import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

import { useSpikeRun } from './runStore.ts';
import { RunRecorder } from './summary.ts';
import { useFrameCounters } from '../../render/useFrameCounters.ts';

/**
 * Graba los deltas de cada frame mientras `useSpikeRun` está en `running` y publica el resumen
 * al completar la duración. Va adentro del root de R3F; no renderiza nada.
 */
export function SpikeRecorder() {
  const recorder = useRef<RunRecorder | null>(null);
  const counters = useFrameCounters();
  const status = useSpikeRun((s) => s.status);
  const runId = useSpikeRun((s) => s.runId);
  const durationMs = useSpikeRun((s) => s.durationMs);

  useEffect(() => {
    recorder.current = status === 'running' ? new RunRecorder(durationMs) : null;
  }, [status, runId, durationMs]);

  useFrame((_state, delta) => {
    const current = recorder.current;
    if (!current) return;
    const summary = current.tick(delta * 1000, counters.current);
    if (summary) {
      recorder.current = null;
      useSpikeRun.getState().finish(summary);
    }
  });

  return null;
}
