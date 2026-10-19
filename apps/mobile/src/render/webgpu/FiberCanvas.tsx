import { useEffect, useRef, type ReactNode } from 'react';
import {
  PixelRatio,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Canvas, type CanvasRef, type NativeCanvas } from 'react-native-webgpu';

import { mountFiberRoot, type FiberRoot } from '../fiberRoot.ts';
import { ReactNativeCanvas, makeWebGPURenderer } from './makeWebGPURenderer.ts';

export interface FiberCanvasProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * R3F sobre react-native-webgpu. El root se monta en el primer layout con tamaño (el contexto
 * se mide al pedirlo) y se desmonta al salir, descartando el renderer.
 */
export function FiberCanvas({ children, style }: FiberCanvasProps) {
  const canvasRef = useRef<CanvasRef>(null);
  const rootRef = useRef<FiberRoot | null>(null);
  const childrenRef = useRef(children);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (rootRef.current || width === 0 || height === 0) return;
    const context = canvasRef.current?.getContext('webgpu');
    if (!context) return;

    const canvas = new ReactNativeCanvas(context.canvas as unknown as NativeCanvas);
    const scale = PixelRatio.get();
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    rootRef.current = mountFiberRoot({
      canvas,
      width: canvas.width,
      height: canvas.height,
      createRenderer: () => makeWebGPURenderer(context, canvas),
      present: () => context.present(),
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

  return (
    <View style={style} onLayout={onLayout}>
      <Canvas ref={canvasRef} style={StyleSheet.absoluteFill} />
    </View>
  );
}
