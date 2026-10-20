import { useEffect, useMemo } from 'react';

import { createRhombusFloorMaterial } from './floor.ts';

/** Plano de 80 m con el piso de rombos procedural. */
export function Floor() {
  const material = useMemo(() => createRhombusFloorMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[80, 80]} />
    </mesh>
  );
}
