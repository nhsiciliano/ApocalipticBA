import { METEORITE_PALETTE } from '@apocalipticba/shared/constants';
import { useEffect, useMemo } from 'react';
import { color, uv } from 'three/tsl';
import { AdditiveBlending, SpriteNodeMaterial } from 'three/webgpu';

import { createMeteoriteMaterial } from '../../render/materials/meteorite.ts';
import { meteoritePulse } from '../materials/toon.tsl.ts';

/**
 * Material del glow: sprite aditivo con caída radial y el pulso de la paleta (ADR-005: en baja
 * y media el glow son billboards, sin bloom). Sin niebla: sumarle el color de la niebla lo
 * convertiría en un disco opaco.
 */
export function createGlowSpriteMaterial(): SpriteNodeMaterial {
  const material = new SpriteNodeMaterial({
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
    fog: false,
  });
  material.name = 'GlowBillboard';
  const falloff = uv().sub(0.5).length().smoothstep(0.05, 0.5).oneMinus().pow(2);
  const pulse = meteoritePulse().mul(0.4).add(0.6);
  material.colorNode = color(METEORITE_PALETTE.glow).mul(falloff).mul(pulse);
  material.opacityNode = falloff;
  return material;
}

export interface BillboardsProps {
  /** Fragmentos de meteorito repartidos en un anillo alrededor del origen. */
  count?: number;
  radius?: number;
  /**
   * `QUALITY_LEVELS[q].glow`: con `billboards` se dibujan los sprites; con `bloom` (calidad
   * alta) solo quedan los fragmentos emisivos y el glow lo pone el pipeline. Los sprites no
   * pueden convivir con el pase Sobel: escriben su normal en el G-buffer y se bordean.
   */
  glow?: 'billboards' | 'bloom';
}

interface Fragment {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

function layoutFragments(count: number, radius: number): Fragment[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const r = radius * (0.75 + 0.25 * Math.sin(i * 2.3));
    return {
      position: [Math.cos(angle) * r, 0.25 + 0.15 * Math.cos(i * 1.7), Math.sin(angle) * r],
      rotation: [i * 0.7, i * 1.3, i * 0.4],
      scale: 0.8 + 0.4 * Math.abs(Math.sin(i * 0.9)),
    };
  });
}

/** Fragmentos de meteorito (material emisivo con pulso) con un billboard aditivo cada uno. */
export function Billboards({ count = 12, radius = 7, glow = 'billboards' }: BillboardsProps) {
  const glowMaterial = useMemo(() => createGlowSpriteMaterial(), []);
  const shardMaterial = useMemo(() => createMeteoriteMaterial(), []);
  const fragments = useMemo(() => layoutFragments(count, radius), [count, radius]);

  useEffect(
    () => () => {
      glowMaterial.dispose();
      shardMaterial.dispose();
    },
    [glowMaterial, shardMaterial],
  );

  return (
    <group>
      {fragments.map((fragment, i) => (
        <group key={i} position={fragment.position}>
          <mesh material={shardMaterial} rotation={fragment.rotation} scale={fragment.scale * 0.3}>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
          {glow === 'billboards' ? (
            <sprite
              material={glowMaterial}
              scale={[fragment.scale * 1.8, fragment.scale * 1.8, 1]}
            />
          ) : null}
        </group>
      ))}
    </group>
  );
}
