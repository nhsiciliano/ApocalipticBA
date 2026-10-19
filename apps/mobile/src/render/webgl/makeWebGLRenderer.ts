import type { ExpoWebGLRenderingContext } from 'expo-gl';
import { WebGPURenderer } from 'three/webgpu';

import type { SurfaceCanvas } from '../fiberRoot.ts';

/**
 * Canvas falso sobre el contexto de expo-gl, con lo que Three y R3F tocan: tamaño en píxeles
 * físicos, `style` y listeners no-op (Three registra `webglcontextlost`).
 */
export class ExpoGLCanvas implements SurfaceCanvas {
  width: number;
  height: number;
  readonly style: Record<string, unknown> = {};

  constructor(private readonly gl: ExpoWebGLRenderingContext) {
    this.width = gl.drawingBufferWidth;
    this.height = gl.drawingBufferHeight;
  }

  get clientWidth(): number {
    return this.width;
  }

  get clientHeight(): number {
    return this.height;
  }

  getContext(): ExpoWebGLRenderingContext {
    return this.gl;
  }

  addEventListener(): void {
    /* no-op: no hay DOM */
  }
  removeEventListener(): void {
    /* no-op: no hay DOM */
  }
  dispatchEvent(): boolean {
    return true;
  }
  setPointerCapture(): void {
    /* no-op: no hay DOM */
  }
  releasePointerCapture(): void {
    /* no-op: no hay DOM */
  }
}

/**
 * Plan B: el mismo `WebGPURenderer` con backend WebGL 2 sobre el contexto de expo-gl.
 * `three.webgpu.js` no incluye `WebGLRenderer`, y así los materiales TSL sirven en ambos.
 */
export function makeWebGLRenderer(gl: ExpoWebGLRenderingContext, canvas: ExpoGLCanvas) {
  return new WebGPURenderer({
    forceWebGL: true,
    antialias: false,
    canvas: canvas as unknown as HTMLCanvasElement,
    context: gl,
  });
}
