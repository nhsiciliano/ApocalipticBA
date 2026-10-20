// Placeholder riggeado del spike: Soldier (mixamo.com) convertido a .gltf + .bin + texturas
// externas con glTF-Transform (ver packages/assets/dist/spike/README.md). La app solo consume
// packages/assets/dist (AGENTS.md).
import soldierBaseColor from '../../../../../packages/assets/dist/spike/soldier/baseColor_1.jpg';
import soldierNormal from '../../../../../packages/assets/dist/spike/soldier/normal_1.jpg';
import soldierBin from '../../../../../packages/assets/dist/spike/soldier/Soldier.bin';
import soldierGltf from '../../../../../packages/assets/dist/spike/soldier/Soldier.gltf';
import quantizedBaseColor from '../../../../../packages/assets/dist/spike/soldier-quantized/baseColor_1.jpg';
import quantizedNormal from '../../../../../packages/assets/dist/spike/soldier-quantized/normal_1.jpg';
import quantizedBin from '../../../../../packages/assets/dist/spike/soldier-quantized/Soldier.bin';
import quantizedGltf from '../../../../../packages/assets/dist/spike/soldier-quantized/Soldier.gltf';

export type SpikeModelVariant = 'soldier' | 'quantized';

export interface GltfAssetSet {
  /** Módulo del `.gltf` (id de asset de Metro). */
  gltf: number;
  /** Módulo del único `.bin`. */
  bin: number;
  /** Módulos de las imágenes, por el `uri` relativo que figura en el `.gltf`. */
  images: Record<string, number>;
}

export const SPIKE_MODELS: Record<SpikeModelVariant, GltfAssetSet> = {
  soldier: {
    gltf: soldierGltf,
    bin: soldierBin,
    images: { 'baseColor_1.jpg': soldierBaseColor, 'normal_1.jpg': soldierNormal },
  },
  quantized: {
    gltf: quantizedGltf,
    bin: quantizedBin,
    images: { 'baseColor_1.jpg': quantizedBaseColor, 'normal_1.jpg': quantizedNormal },
  },
};

export function isSpikeModelVariant(value: unknown): value is SpikeModelVariant {
  return value === 'soldier' || value === 'quantized';
}
