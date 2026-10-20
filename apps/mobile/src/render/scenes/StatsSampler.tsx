import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

import { readJsHeapMb } from '../../debug/hermes.ts';
import { accumulateFrame, createStatsAccumulator, useRenderStats } from '../stats.ts';
import { useFrameCounters } from '../useFrameCounters.ts';

/**
 * Acumula el delta de cada frame y los contadores del último frame dibujado, y publica las
 * métricas en `useRenderStats` una vez por ventana. Va adentro del root de R3F; no renderiza nada.
 */
export function StatsSampler() {
  const acc = useRef(createStatsAccumulator());
  const counters = useFrameCounters();

  useFrame((_state, delta) => {
    const stats = accumulateFrame(acc.current, delta * 1000, counters.current);
    if (stats) useRenderStats.getState().update({ ...stats, jsHeapMb: readJsHeapMb() });
  });

  useEffect(() => () => useRenderStats.getState().reset(), []);

  return null;
}
