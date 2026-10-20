import { addAfterEffect, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import type { WebGPURenderer } from 'three/webgpu';

export interface FrameCounters {
  drawCalls: number;
  triangles: number;
}

/**
 * Contadores de `renderer.info` del último frame dibujado. Se capturan en el after-effect
 * global de R3F (después de todos los `render` del frame), porque `info` se resetea antes de
 * cada frame y un `useFrame` común lo leería en cero.
 */
export function useFrameCounters(): RefObject<FrameCounters> {
  const gl = useThree((state) => state.gl);
  const counters = useRef<FrameCounters>({ drawCalls: 0, triangles: 0 });

  useEffect(
    () =>
      addAfterEffect(() => {
        // En runtime `gl` es el WebGPURenderer que creó GameCanvas (R3F lo tipa como WebGLRenderer).
        const { info } = gl as unknown as WebGPURenderer;
        counters.current = { drawCalls: info.render.drawCalls, triangles: info.render.triangles };
      }),
    [gl],
  );

  return counters;
}
