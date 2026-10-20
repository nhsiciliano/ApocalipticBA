import { StyleSheet, Text, View } from 'react-native';

import { RENDER_BACKEND_LABELS, type RenderBackend } from '../render/backend.ts';
import { useRenderStats } from '../render/stats.ts';
import { useSettings } from '../store/settings.ts';
import { COLORS, MONO_FONT, SPACING } from '../ui/theme.ts';

export interface DebugOverlayProps {
  backend: RenderBackend;
  /** El backend activo no es el preferido (WebGPU no disponible). */
  fallback?: boolean;
}

/**
 * Métricas de render en la esquina: fps promedio y p1 (1 % peor), frame time promedio y p99,
 * draw calls, triángulos, heap de Hermes, backend activo y calidad.
 */
export function DebugOverlay({ backend, fallback = false }: DebugOverlayProps) {
  const stats = useRenderStats();
  const quality = useSettings((s) => s.quality);

  return (
    <View pointerEvents="none" style={styles.box}>
      <Text style={styles.line}>
        {stats.fps} fps · p1 {stats.fpsP1} fps
      </Text>
      <Text style={styles.line}>
        {stats.frameTimeMs.toFixed(1)} ms · p99 {stats.frameTimeP99Ms.toFixed(1)} ms
      </Text>
      <Text style={styles.line}>
        {stats.drawCalls} draw calls · {stats.triangles} tris
      </Text>
      <Text style={styles.line}>
        {RENDER_BACKEND_LABELS[backend]}
        {fallback ? ' (fallback)' : ''}
      </Text>
      <Text style={styles.line}>
        calidad {quality}
        {stats.jsHeapMb === null ? '' : ` · heap JS ${stats.jsHeapMb.toFixed(1)} MB`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 4,
    backgroundColor: 'rgba(11, 11, 13, 0.7)',
  },
  line: {
    color: COLORS.text,
    fontFamily: MONO_FONT,
    fontSize: 11,
    lineHeight: 15,
  },
});
