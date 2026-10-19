/**
 * Polyfills para Hermes. Se importan desde `index.ts` antes que cualquier otro módulo.
 *
 * - `fast-text-encoding`: Hermes no provee `TextDecoder`, que Three.js usa en su núcleo y en
 *   los loaders (GLTFLoader).
 * - `ImageBitmap`: el backend WebGL de Three hace `texture.image instanceof ImageBitmap` en
 *   cada frame; Hermes no define la clase. Un stub vacío hace que `instanceof` dé `false`.
 */
import 'fast-text-encoding';

const globals = globalThis as { ImageBitmap?: unknown };
globals.ImageBitmap ??= class ImageBitmap {};

export {};
