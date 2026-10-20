import type { QualityLevel } from '@apocalipticba/shared/constants';
import { float, modelScale, normalLocal, positionLocal } from 'three/tsl';
import { BackSide, Mesh, MeshBasicNodeMaterial, SkinnedMesh, type Material } from 'three/webgpu';

/** Tinta de los contornos (casi negro, un poco cálido). */
export const INK_COLOR = '#0A0608';

/** Grosor del inverted hull en metros de mundo, por calidad (`QUALITY_LEVELS.outlines`). */
export const OUTLINE_HULL_THICKNESS: Record<QualityLevel, number> = {
  low: 0.012,
  medium: 0.016,
  high: 0.02,
};

/**
 * Material del inverted hull: caras traseras desplazadas por la normal. `modelScale` compensa la
 * escala del nodo para que el grosor quede en metros. En un `SkinnedMesh`, `positionLocal` y
 * `normalLocal` ya vienen skinneados cuando se evalúa `positionNode`.
 */
export function createOutlineHullMaterial(thicknessMeters: number): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial({ side: BackSide, color: INK_COLOR });
  material.name = 'OutlineHull';
  const offset = float(thicknessMeters).div(modelScale.x);
  material.positionNode = positionLocal.add(normalLocal.normalize().mul(offset));
  return material;
}

/**
 * Agrega el hull como hijo del mesh (misma geometría, mismo esqueleto si es skinned) y lo
 * devuelve. Comparte geometría: no hay que descartarla al sacar el hull.
 */
export function createOutlineHull(source: Mesh, material: Material): Mesh {
  const hull = isSkinnedMesh(source)
    ? bindHull(source, material)
    : new Mesh(source.geometry, material);
  hull.name = `${source.name}_hull`;
  hull.frustumCulled = source.frustumCulled;
  source.add(hull);
  return hull;
}

/** Guard por flag (`instanceof` deja los genéricos en `any`). */
export function isSkinnedMesh(object: object): object is SkinnedMesh {
  return (object as { isSkinnedMesh?: boolean }).isSkinnedMesh === true;
}

function bindHull(source: SkinnedMesh, material: Material): SkinnedMesh {
  const hull = new SkinnedMesh(source.geometry, material);
  hull.bindMode = source.bindMode;
  hull.bind(source.skeleton, source.bindMatrix);
  return hull;
}
