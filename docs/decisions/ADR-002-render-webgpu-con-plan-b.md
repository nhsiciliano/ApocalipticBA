# ADR-002 — Render con WebGPU y plan B en WebGL

- **Estado:** Propuesto, pendiente de spike (Hito 7)
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
