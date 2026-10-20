import { QUALITY_LEVELS, type QualityLevel } from '@apocalipticba/shared/constants';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

import { CameraRig } from './CameraRig.tsx';
import { FlatFog } from './FlatFog.tsx';
import { Floor } from './Floor.tsx';
import { Billboards } from './glow/Billboards.tsx';
import { SpikeRecorder } from './measure/SpikeRecorder.tsx';
import { SobelPass } from './SobelPass.tsx';
import { Zombies } from './zombies/Zombies.tsx';

export interface SpikeSceneProps {
  /** Modelo riggeado ya cargado; `null` mientras carga (la escena se dibuja sin zombies). */
  model: GLTF | null;
  zombies: number;
  quality: QualityLevel;
}

/**
 * Escena de estrés del Hito 7: piso de rombos, niebla plana, glow por billboards, cámara en
 * órbita y hasta 30 zombies skinned con toon TSL + inverted hull; Sobel solo en `high`.
 */
export function SpikeScene({ model, zombies, quality }: SpikeSceneProps) {
  const settings = QUALITY_LEVELS[quality];

  return (
    <>
      <FlatFog />
      <CameraRig />
      <hemisphereLight args={['#C9C2B8', '#2A2227', 1.1]} />
      <directionalLight position={[4, 8, 3]} intensity={2.2} />
      <Floor />
      <Billboards glow={settings.glow} />
      {model ? <Zombies model={model} count={zombies} quality={quality} /> : null}
      {settings.outlines === 'hull+sobel' ? <SobelPass scale={settings.sobelScale ?? 0.5} /> : null}
      <SpikeRecorder />
    </>
  );
}
