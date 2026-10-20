import { METEORITE_PALETTE } from '@apocalipticba/shared/constants';
import { color, fog, rangeFogFactor } from 'three/tsl';
import { Color } from 'three/webgpu';

import { COLORS } from '../ui/theme.ts';

/** Niebla de color plano: el fondo de la UI teñido con `skyTint` al 35 % (ADR-005). */
export const SPIKE_FOG = {
  color: new Color(COLORS.background)
    .lerp(new Color(METEORITE_PALETTE.skyTint), METEORITE_PALETTE.skyTintOpacity)
    .getHexString(),
  near: 9,
  far: 26,
} as const;

/** Nodo de niebla lineal por distancia; el mismo color va de fondo para que cierre el horizonte. */
export function createFlatFog(hex: string, near: number, far: number) {
  return fog(color(`#${hex}`), rangeFogFactor(near, far));
}
