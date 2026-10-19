import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Mesh } from 'three/webgpu';

import { COLORS } from '../../ui/theme.ts';
import { createMeteoriteMaterial } from '../materials/meteorite.ts';

/** Escena de prueba del Hito 6: un cubo girando con el material del meteorito. */
export function MeteoriteCube() {
  const mesh = useRef<Mesh>(null);
  const material = useMemo(() => createMeteoriteMaterial(), []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_state, delta) => {
    const current = mesh.current;
    if (!current) return;
    current.rotation.x += delta * 0.6;
    current.rotation.y += delta * 0.9;
  });

  return (
    <>
      <color attach="background" args={[COLORS.background]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={2.5} />
      <mesh ref={mesh} material={material}>
        <boxGeometry args={[1.6, 1.6, 1.6]} />
      </mesh>
    </>
  );
}
