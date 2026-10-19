import { extend, type Catalogue, type ThreeToJSXElements } from '@react-three/fiber';
import * as THREE from 'three/webgpu';

declare module '@react-three/fiber' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- augmentation por fusión de interfaces
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

let extended = false;

/** Registra el namespace de `three/webgpu` (materiales node incluidos) como elementos JSX. Idempotente. */
export function ensureThreeCatalogue(): void {
  if (extended) return;
  extend(THREE as unknown as Catalogue);
  extended = true;
}
