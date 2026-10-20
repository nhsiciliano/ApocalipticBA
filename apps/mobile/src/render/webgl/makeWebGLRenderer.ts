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

type TypedArrayCtor = Float32ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor;

/**
 * expo-gl implementa `clearBuffer{fv,iv,uiv}` solo con typed arrays (lanza
 * `unordered_map::at: key not found` con un array común), mientras que el `WebGLBackend` de
 * Three les pasa arrays literales. Se envuelven esos métodos para convertir el argumento.
 * Idempotente: marca el contexto para no envolverlo dos veces.
 */
const PATCHED = Symbol.for('apocalipticba.expo-gl-typed-arrays');

export function patchExpoGLContext(gl: ExpoWebGLRenderingContext): ExpoWebGLRenderingContext {
  const target = gl as ExpoWebGLRenderingContext & { [PATCHED]?: true };
  if (target[PATCHED]) return gl;
  const wrap = (
    name: 'clearBufferfv' | 'clearBufferiv' | 'clearBufferuiv',
    Ctor: TypedArrayCtor,
  ) => {
    const original = gl[name].bind(gl) as unknown as (
      buffer: number,
      drawbuffer: number,
      values: ArrayLike<number>,
      srcOffset?: number,
    ) => void;
    target[name] = (buffer, drawbuffer, values, srcOffset) => {
      const typed = ArrayBuffer.isView(values) ? values : new Ctor(values);
      original(buffer, drawbuffer, typed, srcOffset);
    };
  };
  wrap('clearBufferfv', Float32Array);
  wrap('clearBufferiv', Int32Array);
  wrap('clearBufferuiv', Uint32Array);

  // expo-gl 58 ignora `srcOffset` y `length` de `bufferSubData(target, dstOffset, data, srcOffset,
  // length)` (WebGL 2) y sube el typed array entero (common/EXWebGLMethods.cpp). El WebGLBackend
  // de Three actualiza sus uniform buffers con esa forma: el bloque se desborda y el driver
  // descarta la llamada. Se recorta el rango en JS. No alcanza para que el plan B presente
  // (docs/spikes/render.md), pero es una incompatibilidad real y queda corregida.
  const bufferSubData: (target: number, dstByteOffset: number, data: ArrayBufferView) => void =
    gl.bufferSubData.bind(gl);
  target.bufferSubData = (
    bufferTarget: number,
    dstByteOffset: number,
    data: ArrayBufferView | ArrayBuffer,
    srcOffset?: number,
    length?: number,
  ) => {
    if (!ArrayBuffer.isView(data) || srcOffset === undefined) {
      bufferSubData(bufferTarget, dstByteOffset, data as ArrayBufferView);
      return;
    }
    const view = data as unknown as {
      slice: (a: number, b?: number) => ArrayBufferView;
      length: number;
    };
    const end = length === undefined || length === 0 ? view.length : srcOffset + length;
    bufferSubData(bufferTarget, dstByteOffset, view.slice(srcOffset, end));
  };
  target[PATCHED] = true;
  return gl;
}

/**
 * Plan B: el mismo `WebGPURenderer` con backend WebGL 2 sobre el contexto de expo-gl.
 * `three.webgpu.js` no incluye `WebGLRenderer`, y así los materiales TSL sirven en ambos.
 */
export function makeWebGLRenderer(gl: ExpoWebGLRenderingContext, canvas: ExpoGLCanvas) {
  patchExpoGLContext(gl);
  return new WebGPURenderer({
    forceWebGL: true,
    antialias: false,
    canvas: canvas as unknown as HTMLCanvasElement,
    context: gl,
  });
}
