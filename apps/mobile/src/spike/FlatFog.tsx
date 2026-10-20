import { useMemo } from 'react';

import { SPIKE_FOG, createFlatFog } from './fog.ts';

/**
 * Niebla de color plano por zona (ADR-005): limita la distancia de dibujado y cierra el fondo.
 * Se cuelga de la escena por `attach` (R3F la saca al desmontar).
 */
export function FlatFog() {
  const fogNode = useMemo(() => createFlatFog(SPIKE_FOG.color, SPIKE_FOG.near, SPIKE_FOG.far), []);

  return (
    <>
      <primitive object={fogNode} attach="fogNode" />
      <color attach="background" args={[`#${SPIKE_FOG.color}`]} />
    </>
  );
}
