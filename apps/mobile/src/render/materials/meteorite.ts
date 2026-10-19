import { METEORITE_PALETTE } from '@apocalipticba/shared/constants';
import { color, float, mix, sin, time } from 'three/tsl';
import { MeshStandardNodeMaterial } from 'three/webgpu';

/**
 * Material TSL de prueba con la paleta del meteorito: base `mid` y emisivo que pulsa entre
 * `dark` y `core` con el período de la paleta. Compila a WGSL (WebGPU) y a GLSL (WebGL 2),
 * así que sirve para validar los dos backends de `GameCanvas`.
 */
export function createMeteoriteMaterial(): MeshStandardNodeMaterial {
  const material = new MeshStandardNodeMaterial();
  const angularSpeed = float((2 * Math.PI * 1000) / METEORITE_PALETTE.pulsePeriodMs);
  const pulse = sin(time.mul(angularSpeed)).mul(0.5).add(0.5);

  material.colorNode = color(METEORITE_PALETTE.mid);
  material.emissiveNode = mix(color(METEORITE_PALETTE.dark), color(METEORITE_PALETTE.core), pulse);
  material.roughnessNode = float(0.75);
  material.metalnessNode = float(0);
  return material;
}
