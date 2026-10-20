import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import {
  Fn,
  color,
  emissive,
  float,
  mix,
  mrt,
  normalView,
  output,
  pass,
  perspectiveDepthToViewZ,
  rtt,
  screenSize,
  uniform,
  uv,
  vec2,
  vec4,
  viewZToOrthographicDepth,
} from 'three/tsl';
import {
  RenderPipeline,
  type Node,
  type PerspectiveCamera,
  type Renderer,
  type Scene,
  type TextureNode,
} from 'three/webgpu';

import { SPIKE_FOG } from '../fog.ts';
import { INK_COLOR } from './outline-hull.ts';

/** Ganancia de los gradientes antes de saturar: normales (vec3) y profundidad relativa. */
const NORMAL_GAIN = 0.35;
/** El gradiente de profundidad se divide por la profundidad del píxel: así una superficie en
 * escorzo (piso lejano) no se lee como borde y un salto real (silueta) sí. */
const DEPTH_GAIN = 4;
/** Umbral suave del borde final. */
const EDGE_LOW = 0.45;
const EDGE_HIGH = 0.85;
/** Bloom selectivo sobre el emisivo (ADR-005: en alta el glow es bloom, no billboards). */
const BLOOM_STRENGTH = 0.35;
const BLOOM_RADIUS = 0.3;

export interface SobelPipeline {
  pipeline: RenderPipeline;
  dispose: () => void;
}

type Tap<T extends 'float' | 'vec3'> = (x: number, y: number) => Node<T>;

/** Magnitud Sobel 3×3 (|Gx| + |Gy|) para un muestreo escalar (profundidad). */
function sobelFloat(tap: Tap<'float'>): Node<'float'> {
  const gx = tap(1, -1)
    .sub(tap(-1, -1))
    .add(tap(1, 0).sub(tap(-1, 0)).mul(2))
    .add(tap(1, 1).sub(tap(-1, 1)));
  const gy = tap(-1, 1)
    .sub(tap(-1, -1))
    .add(tap(0, 1).sub(tap(0, -1)).mul(2))
    .add(tap(1, 1).sub(tap(1, -1)));
  return gx.abs().add(gy.abs());
}

/** Magnitud Sobel 3×3 para un muestreo vectorial (normales): largo de |Gx| + |Gy|. */
function sobelVec3(tap: Tap<'vec3'>): Node<'float'> {
  const gx = tap(1, -1)
    .sub(tap(-1, -1))
    .add(tap(1, 0).sub(tap(-1, 0)).mul(2))
    .add(tap(1, 1).sub(tap(-1, 1)));
  const gy = tap(-1, 1)
    .sub(tap(-1, -1))
    .add(tap(0, 1).sub(tap(0, -1)).mul(2))
    .add(tap(1, 1).sub(tap(1, -1)));
  return gx.abs().add(gy.abs()).length();
}

/**
 * Pase Sobel sobre normales y profundidad (ADR-005, solo en calidad `high`). La escena se dibuja
 * una vez con MRT (color + normal de vista); los bordes se calculan en un RTT a `resolutionScale`
 * (media resolución) muestreando el G-buffer a resolución completa, y se componen con tinta
 * sobre el color. Usa `RenderPipeline` (en three 0.186 `PostProcessing` quedó deprecado).
 */
export function createSobelPipeline(
  renderer: Renderer,
  scene: Scene,
  camera: PerspectiveCamera,
  resolutionScale: number,
): SobelPipeline {
  const scenePass = pass(scene, camera);
  scenePass.setMRT(mrt({ output, normal: normalView, emissive }));
  const colorNode = scenePass.getTextureNode('output');
  const normalNode = scenePass.getTextureNode('normal');
  const depthNode = scenePass.getTextureNode('depth');
  // Se leen por frame: la cámara puede cambiar near/far después de crear el pipeline.
  const near = uniform(camera.near).onFrameUpdate(() => camera.near);
  const far = uniform(camera.far).onFrameUpdate(() => camera.far);

  const edges = rtt(sobelEdges(normalNode, depthNode, near, far), null, null, { resolutionScale });
  const glow = bloom(scenePass.getTextureNode('emissive'), BLOOM_STRENGTH, BLOOM_RADIUS);

  const pipeline = new RenderPipeline(renderer);
  pipeline.outputNode = vec4(mix(colorNode.rgb, color(INK_COLOR), edges.r).add(glow.rgb), 1);

  return {
    pipeline,
    dispose: () => {
      pipeline.dispose();
      glow.dispose();
      edges.dispose();
      scenePass.dispose();
    },
  };
}

function sobelEdges(
  normalNode: TextureNode,
  depthNode: TextureNode,
  near: Node<'float'>,
  far: Node<'float'>,
) {
  return Fn(() => {
    const texel = vec2(1).div(screenSize);
    const offsetUv = (x: number, y: number) => uv().add(vec2(x, y).mul(texel));
    const normalAt: Tap<'vec3'> = (x, y) => normalNode.sample(offsetUv(x, y)).xyz;
    const depthAt: Tap<'float'> = (x, y) =>
      viewZToOrthographicDepth(
        perspectiveDepthToViewZ(depthNode.sample(offsetUv(x, y)).r, near, far),
        near,
        far,
      );

    const centerDepth = depthAt(0, 0);
    const normalEdge = sobelVec3(normalAt).mul(NORMAL_GAIN);
    const depthEdge = sobelFloat(depthAt).div(centerDepth.add(0.002)).mul(DEPTH_GAIN);
    // Dentro de la niebla no hay bordes: evita la banda blanca del horizonte.
    const fogFade = centerDepth.mul(far).smoothstep(SPIKE_FOG.near, SPIKE_FOG.far).oneMinus();
    const edge = normalEdge.max(depthEdge).saturate().smoothstep(EDGE_LOW, EDGE_HIGH).mul(fogFade);
    return vec4(edge, edge, edge, float(1));
  })();
}
