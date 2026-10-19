import { createRoot, unmountComponentAtNode } from '@react-three/fiber';
import type { ReactNode } from 'react';
import type { Camera, Scene, WebGPURenderer } from 'three/webgpu';

import { ensureThreeCatalogue } from './fiber.ts';

/**
 * Superficie DOM mínima que R3F y Three esperan de un canvas. Las implementaciones son
 * adaptadores sobre el canvas nativo de react-native-webgpu o sobre el contexto de expo-gl.
 */
export interface SurfaceCanvas {
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
  style: Record<string, unknown>;
  addEventListener: (type: string, listener: unknown) => void;
  removeEventListener: (type: string, listener: unknown) => void;
  dispatchEvent: (event: unknown) => boolean;
  setPointerCapture: (pointerId: number) => void;
  releasePointerCapture: (pointerId: number) => void;
}

export interface FiberSurface {
  canvas: SurfaceCanvas;
  /** Tamaño en píxeles físicos: el canvas ya está escalado, R3F trabaja con `dpr: 1`. */
  width: number;
  height: number;
  /** Crea el renderer (sin `init()`); el root lo inicializa y lo descarta al desmontar. */
  createRenderer: () => WebGPURenderer;
  /** Presenta el frame: `context.present()` en WebGPU, `gl.endFrameEXP()` en expo-gl. */
  present: () => void;
}

export interface FiberRoot {
  render: (children: ReactNode) => void;
  unmount: () => void;
}

/**
 * Monta un root de R3F sobre una superficie nativa. El renderer se entrega por factory para
 * que R3F sea su dueño y lo descarte en `unmount` (evita el leak al remontar, issue #445 de
 * react-native-webgpu). `present()` se engancha después de cada `render` del loop de R3F.
 */
export function mountFiberRoot(surface: FiberSurface): FiberRoot {
  ensureThreeCatalogue();
  const canvas = surface.canvas as unknown as HTMLCanvasElement;
  const root = createRoot(canvas);
  let renderer: WebGPURenderer | undefined;

  void root.configure({
    size: { top: 0, left: 0, width: surface.width, height: surface.height },
    dpr: 1,
    frameloop: 'always',
    gl: async () => {
      renderer = surface.createRenderer();
      await renderer.init();
      const renderFrame = renderer.render.bind(renderer);
      renderer.render = (scene: Scene, camera: Camera) => {
        const result = renderFrame(scene, camera);
        surface.present();
        return result;
      };
      return renderer;
    },
  });

  return {
    render: (children) => {
      root.render(children);
    },
    unmount: () => {
      unmountComponentAtNode(canvas);
      renderer = undefined;
    },
  };
}
