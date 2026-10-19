import type { NativeCanvas, RNCanvasContext } from 'react-native-webgpu';
import { WebGPURenderer } from 'three/webgpu';

import type { SurfaceCanvas } from '../fiberRoot.ts';

/**
 * Adapta el `NativeCanvas` de react-native-webgpu a la superficie que esperan Three y R3F.
 * Trabaja en píxeles físicos: `clientWidth` devuelve el ancho real del drawing buffer.
 */
export class ReactNativeCanvas implements SurfaceCanvas {
  readonly style: Record<string, unknown> = {};

  constructor(private readonly canvas: NativeCanvas) {}

  get width(): number {
    return this.canvas.width;
  }

  set width(value: number) {
    this.canvas.width = value;
  }

  get height(): number {
    return this.canvas.height;
  }

  set height(value: number) {
    this.canvas.height = value;
  }

  get clientWidth(): number {
    return this.canvas.width;
  }

  get clientHeight(): number {
    return this.canvas.height;
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

/** Renderer WebGPU sobre el contexto nativo. El renderer configura el contexto en `init()`. */
export function makeWebGPURenderer(context: RNCanvasContext, canvas: ReactNativeCanvas) {
  return new WebGPURenderer({
    antialias: true,
    canvas: canvas as unknown as HTMLCanvasElement,
    context,
  });
}
