/**
 * Backend de render que elige `GameCanvas`. `webgpu` es el camino principal (react-native-webgpu
 * + WebGPURenderer); `webgl` es el plan B (expo-gl + WebGPURenderer con backend WebGL 2).
 * Ver docs/decisions/ADR-002 y ADR-008.
 */
export type RenderBackend = 'webgpu' | 'webgl';

export const RENDER_BACKENDS = ['webgpu', 'webgl'] as const satisfies readonly RenderBackend[];

export const DEFAULT_RENDER_BACKEND: RenderBackend = 'webgpu';

export const RENDER_BACKEND_LABELS: Record<RenderBackend, string> = {
  webgpu: 'WebGPU (react-native-webgpu)',
  webgl: 'WebGL 2 (expo-gl)',
};

export function isRenderBackend(value: unknown): value is RenderBackend {
  return typeof value === 'string' && (RENDER_BACKENDS as readonly string[]).includes(value);
}

export function nextRenderBackend(current: RenderBackend): RenderBackend {
  return current === 'webgpu' ? 'webgl' : 'webgpu';
}

export interface BackendCapabilities {
  /** `navigator.gpu` está instalado (react-native-webgpu lo inyecta al importarse). */
  webgpu: boolean;
}

/** Lee las capacidades del runtime actual. En Node (tests) no hay WebGPU. */
export function detectBackendCapabilities(): BackendCapabilities {
  const nav: unknown = typeof navigator === 'undefined' ? undefined : navigator;
  const webgpu =
    typeof nav === 'object' &&
    nav !== null &&
    'gpu' in nav &&
    (nav as { gpu?: unknown }).gpu != null;
  return { webgpu };
}

/** El backend que se monta: el preferido, salvo que pida WebGPU y el runtime no lo tenga. */
export function resolveRenderBackend(
  preferred: RenderBackend,
  capabilities: BackendCapabilities,
): RenderBackend {
  if (preferred === 'webgpu' && !capabilities.webgpu) return 'webgl';
  return preferred;
}
