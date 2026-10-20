/**
 * Polyfills para Hermes. Se importan desde `index.ts` antes que cualquier otro módulo.
 *
 * - `fast-text-encoding`: Hermes no provee `TextDecoder`, que Three.js usa en su núcleo y en
 *   los loaders (GLTFLoader).
 * - `ImageBitmap`: el backend WebGL de Three hace `texture.image instanceof ImageBitmap` en
 *   cada frame; Hermes no define la clase. Un stub vacío hace que `instanceof` dé `false`.
 *   (react-native-webgpu crea sus propios `ImageBitmap` nativos, que no heredan de este stub.)
 * - `ProgressEvent`: `FileLoader` de Three lo instancia al reportar progreso de un `fetch`
 *   (GLTFLoader cargando `.bin`); Hermes no lo define.
 */
import 'fast-text-encoding';

interface ProgressEventInit {
  lengthComputable?: boolean;
  loaded?: number;
  total?: number;
}

const globals = globalThis as { ImageBitmap?: unknown; ProgressEvent?: unknown };
globals.ImageBitmap ??= class ImageBitmap {};
globals.ProgressEvent ??= class ProgressEvent {
  readonly lengthComputable: boolean;
  readonly loaded: number;
  readonly total: number;

  constructor(
    readonly type: string,
    init: ProgressEventInit = {},
  ) {
    this.lengthComputable = init.lengthComputable ?? false;
    this.loaded = init.loaded ?? 0;
    this.total = init.total ?? 0;
  }
};

export {};
