# ADR-002 — Render con WebGPU y plan B en WebGL

- **Estado:** Aceptado para iOS con WebGPU (actualización del 2026-10-20); plan B WebGL descartado para la Fase 0; Android pendiente
- **Fecha:** 2026-10-18

## Contexto

El juego es un FPS 3D con estética cel-shading para iOS y Android. El prompt base propone Three.js con `WebGPURenderer` y React Three Fiber sobre `react-native-wgpu`. La verificación de versiones del 2026-10-18 cambió varias premisas:

- **`react-native-wgpu` está deprecado y renombrado a `react-native-webgpu`** (versión 0.16.1). La API equivalente es `Canvas`, `getContext("webgpu")` y `context.present()`. Exige la **New Architecture** y, en Android, **minSdk 26**.
- **React Three Fiber 9.8.2 necesita un patch de `package.json`** (el campo `"react-native"` debe apuntar al bundle web) aplicado con `patch-package`.
- **Hermes no ejecuta WebAssembly.** Quedan fuera KTX2 (Basis), meshopt y los motores de física en WASM. Draco solo funciona en modo asm.js.
- **`GLTFLoader` no puede crear un `Blob` desde un `ArrayBuffer` en Hermes**, así que un GLB con texturas embebidas no carga. Los niveles y assets se exportan como **`.gltf` + `.bin` + texturas externas**.
- Hermes no provee `TextDecoder`: se usa `fast-text-encoding` como primer import.
- El spike se mide **solo en iPhone 13/14** (iOS 18–26), primero en el simulador y luego con firma gratuita de 7 días. **Android queda sin medir**; el backend Vulkan no está validado.

## Decisión

Se parte de **Three.js `WebGPURenderer` (`three/webgpu`, materiales en TSL) + R3F sobre `react-native-webgpu`**, aislado en `apps/mobile/src/render/` detrás de un componente `GameCanvas`.

El **plan B** es `expo-gl` + `WebGLRenderer`, detrás del mismo `GameCanvas`: el resto de la app no sabe cuál de los dos está activo. TSL compila a WGSL y a GLSL, de modo que los materiales sirven para ambos.

Para la Fase 0 el pipeline de assets usa geometría con `KHR_mesh_quantization` (no necesita decoder) y texturas PNG/JPG de hasta 1024 px. KTX2 y meshopt quedan fuera de la Fase 0; la compresión nativa (ASTC/ETC2 con loader propio) o Draco asm.js son ítems del spike, no bloqueantes.

La decisión final (WebGPU, plan B o híbrido por dispositivo) se toma al cerrar el Hito 7 con `docs/spikes/render.md`, y este ADR pasa a `Aceptado` o se reemplaza. Las métricas del simulador se marcan como no válidas.

## Consecuencias

- Requiere development build (EAS Build en la nube); no funciona en Expo Go.
- El simulador de iOS necesita Xcode instalado aunque el binario lo produzca EAS.
- Hay un patch local de R3F que hay que mantener al actualizar versiones.
- La decisión para Android queda abierta y documentada como no medida.
- Mantener dos renderers detrás de `GameCanvas` tiene costo de mantenimiento; se acepta mientras el spike no demuestre que WebGPU alcanza.

## Alternativas consideradas

- **Solo `expo-gl` + `WebGLRenderer`:** madura y estable, pero cierra la puerta a TSL con compute y a lo que viene en WebGPU; queda como plan B.
- **Motor nativo (Unity, Godot):** descarta el stack TypeScript compartido con la landing, `game-core` y `shared`.
- **Esperar a que el ecosistema madure:** bloquea el prototipo; el spike acota el riesgo con mediciones.

## Actualización 2026-10-20 (cierre del Hito 7)

Resultado del spike (`docs/spikes/render.md`), medido solo en el Simulator (iPhone 17, iOS 27.0), sin iPhone real porque no hay CocoaPods ni firma local; las cifras no valen para decidir rendimiento, sí para lo funcional.

- **Decisión para iOS: WebGPU** (`react-native-webgpu` 0.16.1 + `WebGPURenderer` de three 0.186.1 + R3F 9.8.2). Toda la escena de estrés funciona: 30 `SkinnedMesh` clonados con `AnimationMixer` propio, toon TSL con gradient map, inverted hull, Sobel a media resolución con MRT y bloom selectivo por `RenderPipeline`, `.gltf` externo con texturas por `createImageBitmap` nativo, `KHR_mesh_quantization`. Se confirma o se revisa con la primera medición en dispositivo.
- **Plan B WebGL: descartado para la Fase 0.** El `WebGLBackend` de Three sobre expo-gl compila los materiales TSL y emite los draws, pero no presenta en el modo asíncrono de expo-gl. Se encontraron y corrigieron dos incompatibilidades (typed arrays en `clearBuffer*`; `bufferSubData` ignora `srcOffset`/`length`) y se verificó que expo-gl sí presenta sin Three; la causa restante no apareció en el tiempo asignado. El `WebGLRenderer` clásico no es un plan B válido porque no corre TSL (contradice ADR-005). `GLCanvas` y los shims quedan en el código, documentados, por si expo-gl cambia.
- Premisas corregidas respecto del texto original: R3F no necesita patch (Metro lo resuelve, ADR-008); el plan B era `WebGPURenderer` con `forceWebGL`, no `WebGLRenderer`; `PostProcessing` pasó a llamarse `RenderPipeline`.
- **Android: pendiente, no medido.** Sin dispositivo no hay datos del backend Vulkan.
- Condición abierta: si en un iPhone 13/14 la escena de 30 zombies no llega a 30 fps en `medium`, el primer recurso es reducir objetos skinned (instancing por compute, menos hulls, LOD), no volver a WebGL.
