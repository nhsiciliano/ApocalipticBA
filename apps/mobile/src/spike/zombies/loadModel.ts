import { Asset } from 'expo-asset';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { Loader, type FileLoader, type ImageBitmapLoader } from 'three/webgpu';

import { SPIKE_MODELS, type GltfAssetSet, type SpikeModelVariant } from './soldierAssets.ts';

export interface LoadedModel {
  variant: SpikeModelVariant;
  gltf: GLTF;
  /** Desde que se pidió el asset hasta que GLTFLoader terminó de parsear, en ms. */
  loadTimeMs: number;
  /** Extensiones que declara el archivo (para el checklist: `KHR_mesh_quantization`). */
  extensionsUsed: string[];
}

interface GltfJson {
  buffers?: { uri?: string }[];
  images?: { uri?: string }[];
  extensionsUsed?: string[];
}

/**
 * Cargador de imágenes para Hermes: `fetch` de los bytes codificados y `createImageBitmap`
 * nativo de react-native-webgpu (acepta `ArrayBuffer`). GLTFLoader lo trata como
 * `ImageBitmapLoader` (`isImageBitmapLoader`) y envuelve el resultado en una `Texture`.
 */
class NativeImageBitmapLoader extends Loader<ImageBitmap> {
  readonly isImageBitmapLoader = true;

  override load(
    url: string,
    onLoad?: (data: ImageBitmap) => void,
    _onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    fetch(url)
      .then((response) => response.arrayBuffer())
      .then((bytes) => createImageBitmap(bytes))
      .then((bitmap) => onLoad?.(bitmap))
      .catch((error: unknown) => onError?.(error));
  }
}

/**
 * Cargador de buffers para Hermes: `fetch(url).arrayBuffer()` directo. El `FileLoader` de Three
 * entra en su camino de streaming (`response.body.getReader()`, que RN 0.88 expone) y el
 * `ArrayBuffer` que arma a partir de los chunks sale truncado: los accessors fallan con
 * "byteOffset + length * elementSize must be less than buffer.byteLength".
 */
class NativeArrayBufferLoader extends Loader<ArrayBuffer> {
  override load(
    url: string,
    onLoad?: (data: ArrayBuffer) => void,
    _onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    fetch(url)
      .then((response) => response.arrayBuffer())
      .then((bytes) => onLoad?.(bytes))
      .catch((error: unknown) => onError?.(error));
  }
}

function localUri(asset: Asset): string {
  if (!asset.localUri) throw new Error(`Asset sin localUri: ${asset.name}`);
  return asset.localUri;
}

/**
 * Carga un `.gltf` con `.bin` y texturas externas desde los assets de Expo: baja cada archivo
 * a caché (`Asset.loadAsync`), reescribe los `uri` del JSON con las rutas `file://` y parsea con
 * GLTFLoader (el `FileLoader` hace `fetch` de esas rutas). Así no depende de que Metro sirva
 * rutas relativas ni cambia entre dev y release.
 */
export async function loadSpikeModel(variant: SpikeModelVariant): Promise<LoadedModel> {
  const startedAt = performance.now();
  const set: GltfAssetSet = SPIKE_MODELS[variant];
  const imageNames = Object.keys(set.images);
  const assets = await Asset.loadAsync([
    set.gltf,
    set.bin,
    ...imageNames.map((n) => set.images[n]!),
  ]);
  const [gltfAsset, binAsset, ...imageAssets] = assets;
  if (!gltfAsset || !binAsset) throw new Error('Faltan assets del modelo');

  const json = (await (await fetch(localUri(gltfAsset))).json()) as GltfJson;
  for (const buffer of json.buffers ?? []) buffer.uri = localUri(binAsset);
  for (const image of json.images ?? []) {
    const index = image.uri === undefined ? -1 : imageNames.indexOf(image.uri);
    const asset = imageAssets[index];
    if (asset) image.uri = localUri(asset);
  }

  const loader = new GLTFLoader();
  // El parser crea sus propios loaders; el plugin los reemplaza antes de parsear.
  loader.register((parser) => {
    parser.fileLoader = new NativeArrayBufferLoader(loader.manager) as unknown as FileLoader;
    parser.textureLoader = new NativeImageBitmapLoader(
      loader.manager,
    ) as unknown as ImageBitmapLoader;
    return { name: 'APOCALIPTICBA_hermes_loaders' };
  });
  const gltf = await new Promise<GLTF>((resolve, reject) => {
    loader.parse(JSON.stringify(json), '', resolve, reject);
  });

  return {
    variant,
    gltf,
    loadTimeMs: Math.round(performance.now() - startedAt),
    extensionsUsed: json.extensionsUsed ?? [],
  };
}

/** Libera geometrías y texturas del modelo cargado (los clones las comparten). */
export function disposeModel(model: LoadedModel): void {
  model.gltf.scene.traverse((object) => {
    if (!('geometry' in object)) return;
    const mesh = object as { geometry?: { dispose: () => void }; material?: unknown };
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (typeof material !== 'object' || material === null) continue;
      const m = material as { map?: { dispose: () => void } | null; dispose: () => void };
      m.map?.dispose();
      m.dispose();
    }
  });
}
