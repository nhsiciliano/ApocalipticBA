import { METEORITE_PALETTE } from '@apocalipticba/shared/constants';
import {
  color,
  float,
  mix,
  normalView,
  positionViewDirection,
  sin,
  time,
  uv,
  vec2,
} from 'three/tsl';
import {
  DataTexture,
  MeshToonNodeMaterial,
  NearestFilter,
  RedFormat,
  type ColorRepresentation,
  type Node,
  type Texture,
} from 'three/webgpu';

/** Intensidades de las tres bandas del gradient map (sombra, media, luz), de 0 a 1. */
export const TOON_BANDS = [0.28, 0.62, 1] as const;

/** Borde iluminado (rim): `viewDot.oneMinus()` entre estos valores pasa de 0 a 1. */
const RIM_START = 0.62;
const RIM_END = 0.74;
const RIM_INTENSITY = 0.35;
/** Fuerza del emisivo del pulso sobre la máscara de venas. */
const VEIN_INTENSITY = 0.9;

export interface ToonMaterialOptions {
  color?: ColorRepresentation;
  /** Textura base (el `map` del glTF); si falta se usa `color`. */
  map?: Texture | null;
  /** Máscara emisiva. `procedural`: venas por UV (placeholder hasta tener la máscara pintada). */
  emissiveMask?: 'procedural' | 'none';
}

/**
 * Gradient map de bandas duras para `MeshToonNodeMaterial`: una textura 1D con `NearestFilter`
 * (sin filtrado no hay transición entre bandas). Es `RedFormat`: el modelo toon lee `.r`.
 */
export function createToonGradientMap(bands: readonly number[] = TOON_BANDS): DataTexture {
  const data = new Uint8Array(bands.map((band) => Math.round(band * 255)));
  const texture = new DataTexture(data, bands.length, 1, RedFormat);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** Pulso 0..1 con el período de la paleta (1,5 s), para emisivos del meteorito. */
export function meteoritePulse(): Node<'float'> {
  const angularSpeed = float((2 * Math.PI * 1000) / METEORITE_PALETTE.pulsePeriodMs);
  return sin(time.mul(angularSpeed)).mul(0.5).add(0.5);
}

/**
 * Máscara procedural de venas en espacio UV: líneas finas onduladas. Placeholder hasta que
 * el zombie de Genex traiga su máscara pintada de ojos y venas (Hito 10).
 */
export function proceduralVeinMask(): Node<'float'> {
  const p = uv().mul(vec2(24, 10));
  const wave = sin(p.x.mul(1.7)).mul(0.35);
  const distance = p.y.add(wave).fract().sub(0.5).abs();
  return distance.smoothstep(0.02, 0.06).oneMinus();
}

/**
 * Material toon en TSL (ADR-005): tres bandas duras por gradient map, rim light y emisivo con
 * pulso de 1,5 s sobre una máscara. Compila a WGSL y a GLSL; para `SkinnedMesh` el skinning lo
 * agrega `NodeMaterial` solo.
 */
export function createToonMaterial(options: ToonMaterialOptions = {}): MeshToonNodeMaterial {
  const { color: baseColor = '#8E8A80', map = null, emissiveMask = 'procedural' } = options;
  const material = new MeshToonNodeMaterial({
    color: baseColor,
    gradientMap: createToonGradientMap(),
  });
  material.name = 'ToonTSL';
  material.map = map;

  const viewDot = normalView.dot(positionViewDirection).clamp();
  const rim = viewDot.oneMinus().smoothstep(RIM_START, RIM_END).mul(RIM_INTENSITY);
  const rimColor = color(METEORITE_PALETTE.glow).mul(rim);

  const pulseColor = mix(
    color(METEORITE_PALETTE.dark),
    color(METEORITE_PALETTE.core),
    meteoritePulse(),
  );
  const mask = emissiveMask === 'procedural' ? proceduralVeinMask() : float(0);
  // `NodeMaterial` tiene `emissiveNode` en runtime; @types/three 0.186 solo lo declara en Standard.
  const emissive = material as MeshToonNodeMaterial & { emissiveNode: Node<'vec3'> | null };
  emissive.emissiveNode = pulseColor.mul(mask).mul(VEIN_INTENSITY).add(rimColor);

  return material;
}

/** Libera el material y su gradient map. */
export function disposeToonMaterial(material: MeshToonNodeMaterial): void {
  material.gradientMap?.dispose();
  material.dispose();
}
