import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { PerspectiveCamera, Renderer } from 'three/webgpu';

import { createSobelPipeline } from './materials/sobel-pass.ts';

export interface SobelPassProps {
  /** `QUALITY_LEVELS.high.sobelScale`: escala del RTT de bordes. */
  scale: number;
}

/**
 * Reemplaza el render automático de R3F por el `RenderPipeline` con Sobel (prioridad > 0:
 * R3F deja de llamar a `gl.render`). `present()` sigue corriendo en el after-effect global.
 */
export function SobelPass({ scale }: SobelPassProps) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  const sobel = useMemo(
    // En runtime `gl` es el WebGPURenderer de GameCanvas (R3F lo tipa como WebGLRenderer).
    () => createSobelPipeline(gl as unknown as Renderer, scene, camera as PerspectiveCamera, scale),
    [gl, scene, camera, scale],
  );

  useEffect(() => () => sobel.dispose(), [sobel]);

  useFrame(() => {
    sobel.pipeline.render();
  }, 1);

  return null;
}
