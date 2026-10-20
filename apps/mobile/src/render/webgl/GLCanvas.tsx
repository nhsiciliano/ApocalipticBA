import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useEffect, useRef, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { mountFiberRoot, type FiberRoot } from '../fiberRoot.ts';
import { ExpoGLCanvas, makeWebGLRenderer } from './makeWebGLRenderer.ts';

export interface GLCanvasProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** No aplica: expo-gl fija el drawing buffer al tamaño de la vista. Se acepta por simetría. */
  renderScale?: number;
}

/**
 * R3F sobre expo-gl (plan B). `GLView` entrega el contexto ya dimensionado en
 * `onContextCreate`; el frame se presenta con `gl.endFrameEXP()`.
 */
export function GLCanvas({ children, style }: GLCanvasProps) {
  const rootRef = useRef<FiberRoot | null>(null);
  const childrenRef = useRef(children);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    if (rootRef.current) return;
    const canvas = new ExpoGLCanvas(gl);
    rootRef.current = mountFiberRoot({
      canvas,
      width: canvas.width,
      height: canvas.height,
      createRenderer: () => makeWebGLRenderer(gl, canvas),
      present: () => gl.endFrameEXP(),
    });
    rootRef.current.render(childrenRef.current);
  };

  useEffect(() => {
    childrenRef.current = children;
    rootRef.current?.render(children);
  }, [children]);

  useEffect(
    () => () => {
      rootRef.current?.unmount();
      rootRef.current = null;
    },
    [],
  );

  return <GLView style={style} msaaSamples={4} onContextCreate={onContextCreate} />;
}
