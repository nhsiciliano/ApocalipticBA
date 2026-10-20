# Spike de render (Hito 7)

- **Fecha:** 2026-10-20
- **Dónde:** `apps/mobile/src/spike/` + ruta `app/spike.tsx` (`apocalipticba://spike?...`), assets en `packages/assets/dist/spike/`.
- **Entorno de medición:** iPhone 17 en el Simulator de Xcode 27.1 (iOS 27.0), build EAS `development-simulator` del Hito 6 (sin cambios nativos: todo fue por Metro con el dev client), Hermes, bundle de desarrollo. **No hay iPhone real** (sin CocoaPods no hay firma local) y no hay runtime de iOS 18 instalado. Por eso **ninguna cifra de este documento vale para decidir rendimiento**: el Simulator usa la GPU y la CPU de la Mac, no las del teléfono. Sirven para validación funcional, conteo de draw calls y triángulos, memoria relativa y compilación de shaders.

## Qué se construyó

| Pieza                            | Archivo                                       | Estado                                                                                                                                                                                                                                                                            |
| -------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Escena de estrés                 | `SpikeScene.tsx`                              | Piso de rombos procedural en TSL (`floor.ts`), niebla plana (`fog.ts`, fondo + `fogNode` del mismo color), glow por billboards aditivos (`glow/Billboards.tsx`), cámara en órbita lenta (`CameraRig.tsx`), hasta 30 zombies                                                       |
| Zombies skinned                  | `zombies/Zombies.tsx`, `zombies/loadModel.ts` | `Soldier` de three (mixamo) como `.gltf` + `.bin` + jpg externos; `SkeletonUtils.clone` por instancia, un `AnimationMixer` por instancia con `Walk`/`Run`/`Idle` desfasados; solo se animan hasta `QUALITY_LEVELS[q].maxAnimatedZombies`                                          |
| Material toon TSL                | `materials/toon.tsl.ts`                       | `MeshToonNodeMaterial` + gradient map de 3 bandas duras (`DataTexture` 3×1, `NearestFilter`), rim light y emisivo con pulso de 1,5 s sobre una máscara procedural de venas. Compila a WGSL; el `WebGLBackend` lo compila a GLSL (ver plan B)                                      |
| Inverted hull                    | `materials/outline-hull.ts`                   | Segundo `SkinnedMesh` por mesh (misma geometría y esqueleto), `BackSide`, `positionNode = positionLocal + normalLocal · grosor / modelScale`; grosor por calidad (`OUTLINE_HULL_THICKNESS`)                                                                                       |
| Sobel a media resolución + bloom | `materials/sobel-pass.ts`, `SobelPass.tsx`    | Solo en `high`. `RenderPipeline` (en three 0.186 `PostProcessing` está deprecado) con `pass()` + MRT (`output`, `normalView`, `emissive`); bordes por Sobel de normales y profundidad relativa en un `rtt` con `resolutionScale: 0.5`; bloom selectivo sobre `emissive`           |
| Overlay y muestras               | `DebugOverlay.tsx`, `measure/*`               | fps promedio, p1 fps (1 % peor, = 1000 / p99 del frame time), frame time promedio y p99, draw calls, triángulos, heap de Hermes (`HermesInternal.getInstrumentedStats`). Corridas de N s por deep link (`run=10`) o botón; el resumen se vuelca por consola como `[spike-sample]` |
| Prueba de leak                   | `app/spike.tsx` (`remount=10`)                | Desmonta y remonta el `GameCanvas` 10 veces, loguea el heap en cada ciclo (`[spike-remount]`)                                                                                                                                                                                     |

Deep links útiles:

```sh
xcrun simctl openurl booted "apocalipticba://spike?zombies=30&quality=high&backend=webgpu&run=10"
xcrun simctl openurl booted "apocalipticba://spike?zombies=30&quality=medium&model=quantized"
xcrun simctl openurl booted "apocalipticba://spike?zombies=30&quality=medium&remount=10"
```

## Mediciones (Simulator, WebGPU)

iPhone 17, iOS 27.0, Simulator en Mac, build de desarrollo (Hermes sin optimizar, overlay y Metro conectados). 10 s por corrida después de 3 s de calentamiento. Todos los draw calls incluyen el quad de salida de Three; en `high`, además, el RTT de bordes y el bloom.

| Calidad | Zombies (animados) | Modelo    | fps prom. | p1 fps | frame time prom. | p99      | máx.     | Draw calls | Triángulos | Heap Hermes | RSS proceso | Válido para decidir |
| ------- | ------------------ | --------- | --------- | ------ | ---------------- | -------- | -------- | ---------- | ---------- | ----------- | ----------- | ------------------- |
| low     | 0 (0)              | soldier   | 59        | 32.7   | 16.9 ms          | 30.6 ms  | 62.2 ms  | 26         | 267        | 24 MB       | 90 MB       | no (Simulator)      |
| low     | 10 (10)            | soldier   | 49.7      | 12.1   | 20.1 ms          | 82.6 ms  | 133.6 ms | 66         | 227.787    | 32 MB       | 90 MB       | no (Simulator)      |
| low     | 30 (12)            | soldier   | 30.3      | 12.5   | 33 ms            | 79.9 ms  | 124.5 ms | 146        | 682.827    | 36 MB       | 97 MB       | no (Simulator)      |
| medium  | 0 (0)              | soldier   | 59.5      | 55.6   | 16.8 ms          | 18 ms    | 61.8 ms  | 26         | 267        | 24 MB       | 84 MB       | no (Simulator)      |
| medium  | 10 (10)            | soldier   | 52        | 18.4   | 19.2 ms          | 54.5 ms  | 91.2 ms  | 66         | 227.787    | 32 MB       | 83 MB       | no (Simulator)      |
| medium  | 30 (20)            | soldier   | 29.5      | 11.9   | 33.9 ms          | 84.1 ms  | 97 ms    | 146        | 682.827    | 36 MB       | 95 MB       | no (Simulator)      |
| high    | 0 (0)              | soldier   | 58        | 27.8   | 17.2 ms          | 35.9 ms  | 49.4 ms  | 27         | 256        | 28 MB       | 90 MB       | no (Simulator)      |
| high    | 10 (10)            | soldier   | 44        | 12.9   | 22.7 ms          | 77.8 ms  | 112 ms   | 67         | 227.776    | 32 MB       | 89 MB       | no (Simulator)      |
| high    | 30 (30)            | soldier   | 24.2      | 8.7    | 41.3 ms          | 114.9 ms | 152.5 ms | 147        | 682.816    | 36 MB       | 96 MB       | no (Simulator)      |
| medium  | 30 (20)            | quantized | 30.8      | 13.9   | 32.5 ms          | 71.9 ms  | 90.5 ms  | 146        | 682.827    | 36 MB       | 116 MB      | no (Simulator)      |

- Canvas por calidad (`renderScale` aplicado al drawing buffer): low 1967×905 (0,75), medium 2229×1025 (0,85), high 2622×1206 (1).
- Carga del modelo (`Asset.loadAsync` + parse de GLTFLoader): entre 0,4 s y 4,6 s según el estado de la caché de assets (la primera descarga desde Metro domina); con caché caliente, 1–2 s. El clonado de 30 instancias con hull tarda ~1 s más en el hilo de JS.
- Memoria: el RSS del proceso del Simulator (incluye el runtime de desarrollo) se mueve entre 83 y 116 MB; el heap de Hermes pasa de 24 MB (escena vacía) a 36 MB con 30 zombies.
- Lo que sí dice la tabla aun en Simulator: el costo escala con la cantidad de objetos skinned dibujados, no con la cantidad animada (low con 12 animados ≈ medium con 20 ≈ 30 fps con 30 zombies). Con 30 zombies hay 60 `SkinnedMesh` + 60 hulls = 120 draw calls con subida de huesos por objeto; ese overhead de JS/driver por objeto es lo que hay que medir en el teléfono. El `renderScale` no cambia nada en Simulator (la GPU de la Mac sobra), así que su efecto real también queda para el dispositivo.
- iOS 18: no hay runtime instalado en la máquina; no se midió.

### Remontaje del canvas (leak del renderer, issue #445)

`remount=10` con 30 zombies en `medium`: el RSS del proceso oscila con cada reconstrucción (picos de 300–500 MB mientras se clonan las instancias) y vuelve a ~96–124 MB al terminar: **no se ve un leak nativo del renderer** (R3F es dueño del `WebGPURenderer` por factory y lo descarta en `unmount`). El heap de Hermes, en cambio, sube de 36 MB a 96 MB a lo largo de los 10 ciclos y queda en 116 MB (allocatedBytes 108 MB) después de una corrida más: hay **crecimiento del lado JS** (candidatos: clones de `SkeletonUtils`, caches de nodos de Three, roots de R3F) que todavía no se separó de la demora del GC. Queda como pendiente de perfilar con Instruments o con `HermesInternal` en una sesión larga.

## Checklist de incógnitas del pipeline

| Ítem                                                | Resultado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.gltf` externo (`.bin` + texturas) en Hermes       | **Funciona.** Cada archivo se registra como asset de Metro (`assetExts` + `gltf bin jpg`), se baja con `Asset.loadAsync`, se reescriben los `uri` del JSON con las rutas `file://` y se parsea con `GLTFLoader.parse`. Hicieron falta dos loaders propios (`loadModel.ts`): buffers por `fetch().arrayBuffer()` (el `FileLoader` de Three entra en el camino de streaming de RN 0.88 y el buffer sale truncado) e imágenes por `createImageBitmap(bytes)` de react-native-webgpu. Más un stub de `ProgressEvent` en `polyfills.ts`. |
| `.glb` con texturas embebidas                       | **No funciona para texturas.** La geometría y las animaciones parsean (55 ms); las imágenes en `bufferView` fallan con `Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported` (el `Blob` de RN). Sería viable con un plugin de GLTFLoader que implemente `loadTexture` leyendo el `bufferView` y llamando a `createImageBitmap`; no se hizo. Se mantiene la regla: `.gltf` + `.bin` + texturas externas.                                                                                                       |
| `KHR_mesh_quantization` (`gltf-transform quantize`) | **Funciona** en WebGPU: variante `soldier-quantized` (posición 14 bits, normal 10, uv 12; `.bin` 520 KB vs 699 KB) carga y dibuja igual que la base (fila `quantized` de la tabla).                                                                                                                                                                                                                                                                                                                                                 |
| Draco en modo asm.js                                | **No probado.** `DRACOLoader` depende de Web Workers y Hermes no tiene `Worker` (`typeof Worker === 'undefined'` en las muestras); haría falta un loader propio que cargue `draco_decoder.js` en el hilo de JS. Mientras la cuantización alcance, no se justifica.                                                                                                                                                                                                                                                                  |
| Texturas comprimidas nativas (solo relevamiento)    | **No implementado.** Opciones sin WASM: (a) KTX1 con ASTC/ETC2 vía `KTXLoader` de `three/addons` (parser JS puro; el `WebGPURenderer` expone `texture-compression-astc` en iOS y `-etc2` en Android, habría que verificar `CompressedTexture` en el backend WebGPU); (b) PVR/ASTC crudos con `CompressedTexture` y un parser propio. Generación con `toktx` o `astcenc`. Las PNG/JPG de 1024 px de la Fase 0 ocupan 5,6 MB de GPU cada una (gltf-transform), así que conviene revisarlo antes del lote de Genex.                    |
| Leak de renderer al remontar                        | Ver arriba: sin leak nativo visible; crecimiento del heap JS pendiente de perfilar.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Skinning en `WebGPURenderer`                        | **Funciona** con `MeshToonNodeMaterial` y con el material del hull (`NodeMaterial` agrega el skinning solo). 30 instancias con esqueleto propio y 30 mixers corren; compartir esqueleto/instancing no se probó: three trae el ejemplo `webgpu_skinning_instancing` (skinning por compute + `InstancedMesh`, exclusivo de WebGPU) y es el camino si el teléfono no aguanta 60 objetos skinned.                                                                                                                                       |
| Skinning en el `WebGLBackend`                       | Compila a GLSL (el backend emite 26 draw calls con la escena vacía y 146 con 30 zombies, sin errores de shader), pero no se puede ver: el plan B no presenta.                                                                                                                                                                                                                                                                                                                                                                       |

## Plan B WebGL (expo-gl + `WebGPURenderer` con `forceWebGL`)

Tiempo dedicado: una tarde, como se pidió. Lo que se probó, en orden:

1. **expo-gl presenta sin Three.** Un `clearColor` rojo + `endFrameEXP()` por frame desde `onContextCreate` pinta la pantalla a 60 fps. El problema no es expo-gl en la New Architecture ni el `GLView`.
2. **La secuencia de comandos de Three es válida.** Se instrumentaron las ~100 llamadas GL por frame del `WebGLBackend`: render target interno (`bindFramebuffer(obj)`, `clearBufferfv/fi`), uniform buffers (`bindBufferBase`, `bufferSubData` con rangos), VAOs, draws, y al final `bindFramebuffer(null)` + el quad de salida + `endFrameEXP()`. Todas las funciones existen en expo-gl 58 (`common/EXWebGLMethods*.cpp`).
3. **Dos incompatibilidades reales, corregidas con shims en `makeWebGLRenderer.ts`:** expo-gl solo acepta typed arrays en `clearBuffer{fv,iv,uiv}` (Hito 6) e **ignora `srcOffset` y `length` en `bufferSubData`** (sube el typed array entero; Three actualiza sus uniform buffers por rangos, así que el bloque se desborda y el driver descarta la llamada). Con el recorte en JS, el backend sigue sin presentar.
4. **Descartadas:** `outputBufferType: UnsignedByteType` (render target RGBA8 en vez de RGBA16F) no cambia nada; `renderer.outputColorSpace`/`toneMapping` sin pase de salida ya se había probado en el Hito 6.
5. **Las llamadas síncronas de expo-gl son el síntoma más raro:** `gl.getError()`, `getParameter()` o `flushEXP()` tardan 1–1,6 s cada una en esta configuración (por eso el "modo bloqueante" del Hito 6 mostraba el cubo a ~950 ms por frame: cada llamada paga ese costo). Que con flush bloqueante se vea y en modo asíncrono no, apunta al lote de comandos de expo-gl (orden o pérdida de estado entre lotes), no a los shaders. No se encontró la causa en el tiempo asignado.
6. **`WebGLRenderer` clásico por alias aparte no se probó a propósito:** no acepta materiales TSL, así que no es el plan B de ADR-005 (duplicaría todos los materiales en GLSL y dos copias de Three en el bundle). Si algún día hace falta WebGL, la condición es que el `WebGLBackend` de Three presente sobre expo-gl, no cambiar de renderer.

## Decisión para iOS

**WebGPU (react-native-webgpu 0.16.1 + `WebGPURenderer` de three 0.186.1), sin plan B activo.** El plan B WebGL queda **descartado para la Fase 0** con la evidencia de arriba; `GLCanvas` y los shims se conservan en el código porque son chicos, documentan las incompatibilidades y permiten reabrir el tema si expo-gl corrige `bufferSubData` o aparece la causa de la presentación. `settings.renderBackend` sigue existiendo (default `webgpu`); elegir `webgl` muestra pantalla negra con el overlay funcionando.

Condiciones de la decisión:

- Se confirma o se revisa con la primera medición en iPhone real (ver abajo). Si en un iPhone 13/14 la escena de 30 zombies no llega a 30 fps en `medium`, el primer recurso es reducir objetos skinned (instancing por compute de WebGPU, menos hulls, LOD), no cambiar de backend.
- `maxAnimatedZombies` por calidad sigue siendo el límite de mixers; el límite de objetos dibujados hay que fijarlo con datos del teléfono.
- Android: **pendiente, no medido**. react-native-webgpu usa Vulkan por Dawn; sin dispositivo no hay nada que decir.

## Lo que solo se puede confirmar en iPhone real

- fps, p1 y frame time de cada combinación de la tabla (y si el `renderScale` compensa algo).
- Temperatura y throttling a 10 minutos, consumo de batería.
- Memoria real del proceso (en Simulator el RSS incluye el runtime de desarrollo de la Mac).
- Tiempo de compilación de shaders WGSL en el dispositivo (en Simulator la primera carga de `high` tardó 6 s con la caché fría, dominada por la descarga de assets).
- Si los jpg de 1024 px sin comprimir caben en el presupuesto de memoria con el nivel completo.
- El crecimiento del heap al remontar (si es GC perezoso o leak).

## Desvíos respecto del plan y de los ADR

- `PostProcessing` → `RenderPipeline` (three 0.183+; Context7 lo marca deprecado). ADR-005 actualizado.
- Billboards aditivos y Sobel no conviven (escriben su normal en el G-buffer): en `high` no hay sprites y el glow es bloom, como ya decía `QUALITY_LEVELS`.
- `FileLoader` e `ImageBitmapLoader` de Three se reemplazan por loaders propios en Hermes (ver checklist). Anotado en `docs/tooling/versiones.md`.
- El `WebGLRenderer` clásico como plan B (ADR-002 original) se descarta porque no corre TSL; ADR-002 actualizado con la decisión.

## Pendientes que deja el spike

1. Medir en iPhone real cuando haya firma (CocoaPods o Xcode con Apple ID).
2. Perfilar el heap de Hermes al remontar el canvas.
3. Probar `webgpu_skinning_instancing` (skinning por compute + `InstancedMesh`) si el teléfono no aguanta 60 objetos skinned.
4. Relevar KTX1/ASTC para las texturas antes del lote de Genex (Hito 10).
5. Ajustar umbrales del Sobel y máscara emisiva con el zombie de Genex (la máscara procedural tiñe todo el cuerpo).
