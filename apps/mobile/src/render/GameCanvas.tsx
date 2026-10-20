import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { detectBackendCapabilities, resolveRenderBackend } from './backend.ts';
import { DebugOverlay } from '../debug/DebugOverlay.tsx';
import { useSettings } from '../store/settings.ts';
import { StatsSampler } from './scenes/StatsSampler.tsx';
import { GLCanvas } from './webgl/GLCanvas.tsx';
import { FiberCanvas } from './webgpu/FiberCanvas.tsx';

export interface GameCanvasProps {
  /** Escena R3F (elementos de `three/webgpu`). */
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Escala del drawing buffer (`QUALITY_LEVELS.renderScale`); solo el backend WebGPU la aplica. */
  renderScale?: number;
}

/**
 * Único punto de contacto de la app con el renderer (ADR-002). Elige el backend según
 * `settings.renderBackend` y remonta el canvas (por `key`) cuando cambia el backend o la escala.
 */
export function GameCanvas({ children, style, renderScale = 1 }: GameCanvasProps) {
  const preferred = useSettings((s) => s.renderBackend);
  const debugOverlay = useSettings((s) => s.debugOverlay);
  const backend = useMemo(
    () => resolveRenderBackend(preferred, detectBackendCapabilities()),
    [preferred],
  );
  const Surface = backend === 'webgpu' ? FiberCanvas : GLCanvas;

  return (
    <View style={[styles.root, style]}>
      <Surface
        key={`${backend}:${renderScale}`}
        style={StyleSheet.absoluteFill}
        renderScale={renderScale}
      >
        {children}
        {debugOverlay ? <StatsSampler /> : null}
      </Surface>
      {debugOverlay ? <DebugOverlay backend={backend} fallback={backend !== preferred} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
});
