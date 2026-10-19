import type { Vec3 } from './vec3.ts';

export interface Aabb {
  readonly min: Vec3;
  readonly max: Vec3;
}

/**
 * True si el segmento vertical `base → base + height` (el eje de la cápsula del jugador) toca la
 * caja. Así un trigger que arranca en el piso detecta al jugador aunque los pies queden apenas por
 * debajo o por encima del borde inferior.
 */
export function aabbIntersectsVerticalSegment(box: Aabb, base: Vec3, height: number): boolean {
  return (
    base[0] >= box.min[0] &&
    base[0] <= box.max[0] &&
    base[2] >= box.min[2] &&
    base[2] <= box.max[2] &&
    base[1] <= box.max[1] &&
    base[1] + height >= box.min[1]
  );
}
