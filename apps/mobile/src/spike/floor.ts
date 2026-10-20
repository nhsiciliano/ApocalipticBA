import { checker, color, mix, positionWorld, vec2 } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

import { INK_COLOR } from './materials/outline-hull.ts';

/** Lado de cada rombo en metros. */
const TILE_SIZE = 1.5;
const TILE_A = '#2B2A30';
const TILE_B = '#39384A';

/**
 * Piso de rombos procedural (placeholder de la textura de Genex, Hito 10): damero girado 45° en
 * coordenadas de mundo, con juntas de tinta. Sin iluminación, con niebla.
 */
export function createRhombusFloorMaterial(): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  material.name = 'RhombusFloor';
  const p = positionWorld.xz.div(TILE_SIZE);
  const q = vec2(p.x.add(p.y), p.x.sub(p.y));
  const edge = q.fract().sub(0.5).abs().mul(2);
  const grout = edge.x.max(edge.y).smoothstep(0.9, 0.97);
  const tiles = mix(color(TILE_A), color(TILE_B), checker(q));
  material.colorNode = mix(tiles, color(INK_COLOR), grout);
  return material;
}
