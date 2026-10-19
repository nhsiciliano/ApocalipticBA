import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { WebGPURenderer } from 'three/webgpu';

import { accumulateFrame, createStatsAccumulator, useRenderStats } from '../stats.ts';

/**
 * Lee `renderer.info` cada frame y publica las métricas en `useRenderStats` una vez por
 * ventana. Va adentro del root de R3F; no renderiza nada.
 */
export function StatsSampler() {
  const acc = useRef(createStatsAccumulator());

  useFrame((state, delta) => {
    // En runtime `state.gl` es el WebGPURenderer que creó GameCanvas (R3F lo tipa como WebGLRenderer).
    const { info } = state.gl as unknown as WebGPURenderer;
    const stats = accumulateFrame(acc.current, delta * 1000, {
      drawCalls: info.render.drawCalls,
      triangles: info.render.triangles,
    });
    if (stats) useRenderStats.getState().update(stats);
  });

  useEffect(() => () => useRenderStats.getState().reset(), []);

  return null;
}
