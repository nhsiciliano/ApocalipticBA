import type { Vec3 as MutableVec3 } from '@apocalipticba/shared';

/**
 * Vector 3D inmutable, en metros. Ejes como Three.js: Y hacia arriba; con `yaw = 0` el jugador mira
 * hacia -Z. Los helpers siempre devuelven un vector nuevo: el core nunca muta un `Vec3` que ya
 * expuso al host.
 */
export type Vec3 = Readonly<MutableVec3>;

export const ZERO: Vec3 = [0, 0, 0];

export function vec3(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function isFiniteVec3(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

/**
 * Distancia de `point` al segmento vertical que va de `base` a `base + height` (el eje de la cápsula
 * del jugador). Sirve para rangos de pickup e interacción: un objeto a la altura del piso o de los
 * ojos queda igual de cerca.
 */
export function distanceToVerticalSegment(point: Vec3, base: Vec3, height: number): number {
  const y = Math.min(Math.max(point[1], base[1]), base[1] + height);
  return Math.hypot(point[0] - base[0], point[1] - y, point[2] - base[2]);
}

/** Yaw (radianes) que mira desde `from` hacia `to` en el plano XZ; `null` si no hay desplazamiento horizontal. */
export function yawTowards(from: Vec3, to: Vec3): number | null {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  if (Math.abs(dx) < 1e-9 && Math.abs(dz) < 1e-9) return null;
  return Math.atan2(-dx, -dz);
}
