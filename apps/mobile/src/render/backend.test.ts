import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RENDER_BACKEND,
  RENDER_BACKENDS,
  RENDER_BACKEND_LABELS,
  detectBackendCapabilities,
  isRenderBackend,
  nextRenderBackend,
  resolveRenderBackend,
} from './backend.ts';

describe('render backend', () => {
  it('defaults to webgpu and labels every backend', () => {
    expect(DEFAULT_RENDER_BACKEND).toBe('webgpu');
    for (const backend of RENDER_BACKENDS) expect(RENDER_BACKEND_LABELS[backend]).toBeTruthy();
  });

  it('validates persisted values', () => {
    expect(isRenderBackend('webgpu')).toBe(true);
    expect(isRenderBackend('webgl')).toBe(true);
    expect(isRenderBackend('metal')).toBe(false);
    expect(isRenderBackend(undefined)).toBe(false);
  });

  it('toggles between the two backends', () => {
    expect(nextRenderBackend('webgpu')).toBe('webgl');
    expect(nextRenderBackend('webgl')).toBe('webgpu');
  });

  it('falls back to webgl only when webgpu is requested and unavailable', () => {
    expect(resolveRenderBackend('webgpu', { webgpu: true })).toBe('webgpu');
    expect(resolveRenderBackend('webgpu', { webgpu: false })).toBe('webgl');
    expect(resolveRenderBackend('webgl', { webgpu: true })).toBe('webgl');
    expect(resolveRenderBackend('webgl', { webgpu: false })).toBe('webgl');
  });

  it('reports no webgpu outside the app runtime', () => {
    expect(detectBackendCapabilities()).toEqual({ webgpu: false });
  });
});
