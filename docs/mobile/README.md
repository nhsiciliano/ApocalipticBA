# App mobile (`apps/mobile`)

Expo 58 (React Native 0.88, React 19.3, Expo Router) con el `GameCanvas` dual de ADR-002: WebGPU por react-native-webgpu y plan B en WebGL 2 por expo-gl. Las decisiones de estructura están en [ADR-008](../decisions/ADR-008-estructura-app-mobile.md).

## Qué hay

| Carpeta / archivo                   | Contenido                                                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                          | Entrada: polyfill `fast-text-encoding` (Hermes no trae `TextDecoder`) y después `expo-router/entry`                                                               |
| `app/`                              | Pantallas placeholder de Expo Router: `index`, `menu`, `scenarios`, `play`, `pause`, `game-over`, `summary`, `journal`, `ranking`, `profile`, `settings`, `login` |
| `src/navigation/routes.ts`          | `ROUTES` tipado; el test verifica que exista una pantalla por ruta                                                                                                |
| `src/render/GameCanvas.tsx`         | Único punto de contacto con el renderer: elige el backend por `settings.renderBackend` y remonta al cambiarlo                                                     |
| `src/render/fiberRoot.ts`           | Monta R3F (`createRoot`, bundle web) sobre una superficie nativa; engancha `present()` después de cada `render`                                                   |
| `src/render/webgpu/`                | `FiberCanvas` (Canvas de react-native-webgpu) y `makeWebGPURenderer` (`WebGPURenderer` + `context.present()`)                                                     |
| `src/render/webgl/`                 | `GLCanvas` (`GLView` de expo-gl) y `makeWebGLRenderer` (`WebGPURenderer` con `forceWebGL` + `gl.endFrameEXP()`)                                                   |
| `src/render/materials/meteorite.ts` | Material TSL de prueba con la paleta del meteorito (`METEORITE_PALETTE` de `shared`)                                                                              |
| `src/render/scenes/`                | `MeteoriteCube` (cubo girando) y `StatsSampler` (lee `renderer.info` por frame)                                                                                   |
| `src/render/backend.ts`             | `RenderBackend`, etiquetas y `resolveRenderBackend` (cae a WebGL si no hay `navigator.gpu`)                                                                       |
| `src/store/`                        | Ajustes en Zustand 5 persistidos en MMKV 4 (`renderBackend`, `quality`, `debugOverlay`), con factory testeable en Node                                            |
| `src/debug/DebugOverlay.tsx`        | fps, frame time, draw calls, triángulos, backend activo y calidad (`QUALITY_LEVELS`)                                                                              |
| `src/ui/`                           | `Screen`, `Button`, `Segmented` y el tema (gris apagado + rojo del meteorito como único acento)                                                                   |
| `metro.config.js`                   | Alias `three` → build WebGPU, `three/tsl`, `three/addons/*`; R3F resuelto al bundle web; `assetExts` + glb gltf bin hdr                                           |
| `app.json`                          | Landscape, New Architecture, bundle id `ar.com.apocalipticba.app`, plugins `expo-router`, `expo-dev-client`, `react-native-webgpu`, `expo-screen-orientation`     |
| `eas.json`                          | Perfiles `development` (device), `development-simulator` (iOS Simulator) y `preview`; Node 24.20.0 y pnpm 12.14.0                                                 |

## Cómo se corre

Requiere un development build (no funciona en Expo Go: react-native-webgpu, expo-gl y MMKV son módulos nativos).

```sh
pnpm install                              # desde la raíz
pnpm --filter @apocalipticba/mobile dev   # Metro en modo dev client (o `pnpm dev` en la raíz vía turbo)
```

Con el build instalado en el Simulator, abrilo y conectalo al Metro que corre en tu máquina. La pantalla `play` monta el `GameCanvas`; en `settings` se cambia el backend, la calidad y el overlay (se guardan en el dispositivo).

Deep links útiles (el scheme es `apocalipticba`):

```sh
xcrun simctl openurl booted "apocalipticba://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"  # cargar el bundle
xcrun simctl openurl booted "apocalipticba://play?backend=webgl"    # abrir la partida con un backend (se persiste)
xcrun simctl openurl booted "apocalipticba://settings"              # cualquier ruta de app/
```

En iOS 26+ el Simulator pregunta "¿Abrir en ApocalipticBA?" por cada deep link y, si corrés sin ventana (Xcode 27 ya no trae `Simulator.app`; la UI es `DeviceHub.app`), no hay dónde tocar. Expo CLI evita el diálogo escribiendo la aprobación del scheme en el dispositivo; se puede hacer a mano, con el Simulator apagado:

```sh
P=~/Library/Developer/CoreSimulator/Devices/<UDID>/data/Library/Preferences/com.apple.launchservices.schemeapproval.plist
[ -f "$P" ] || plutil -create binary1 "$P"
/usr/libexec/PlistBuddy -c "Add :com.apple.CoreSimulator.CoreSimulatorBridge-->apocalipticba string ar.com.apocalipticba.app" "$P"
```

Para que el dev menu no tape la app en el primer arranque: `xcrun simctl spawn booted defaults write ar.com.apocalipticba.app EXDevMenuIsOnboardingFinished -bool true`.

Verificación local sin build nativo:

```sh
pnpm --filter @apocalipticba/mobile lint
pnpm --filter @apocalipticba/mobile typecheck
pnpm --filter @apocalipticba/mobile test
cd apps/mobile
pnpm exec expo export --platform ios --output-dir /tmp/apocalipticba-export   # bundle Metro
pnpm exec expo prebuild --platform ios --no-install                            # plugins (genera ios/, ignorado por git)
```

## Cómo se construye e instala el build

El login lo hace cada persona con su cuenta de Expo (nunca se guardan credenciales en el repo). El proyecto ya está vinculado (`extra.eas.projectId` en `app.json`, cuenta `nhsiciliano`).

```sh
cd apps/mobile
pnpm exec eas login                       # o `eas login --device` si no hay terminal interactiva
pnpm exec eas build --profile development-simulator --platform ios
```

El primer build (2026-10-19) tardó 8 minutos de compilación más 1 de cola en el plan free. EAS deja un `.tar.gz` con el `.app`; para instalarlo en el Simulator:

```sh
tar -xzf build-XXXX.tar.gz
xcrun simctl boot "iPhone 17"            # o el que tengas
xcrun simctl install booted ApocalipticBA.app
xcrun simctl launch booted ar.com.apocalipticba.app
```

Builds locales (`expo run:ios` o `eas build --local`) necesitan CocoaPods, que no está instalado en la máquina de desarrollo; por eso el camino por defecto es EAS en la nube.

## Estado de cada backend (iPhone 17, iOS 27.0, Simulator, 2026-10-19)

| Backend                             | Implementación                                                                    | Estado                                                                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| WebGPU (react-native-webgpu 0.16.1) | `WebGPURenderer` sobre `Canvas` + `context.present()`; R3F con `createRoot`       | **Funciona**: cubo girando con el material TSL (color y pulso emisivo), 60 fps, overlay con 2 draw calls y 13 triángulos (cubo + pase de salida) |
| WebGL 2 (expo-gl 58.0.3)            | El mismo `WebGPURenderer` con `forceWebGL: true` sobre `GLView` + `endFrameEXP()` | **Dibuja pero no presenta** en el modo normal de expo-gl; ver abajo. Pendiente para el Hito 7                                                    |

Lo que se encontró con el plan B, en orden:

1. expo-gl solo acepta typed arrays en `clearBuffer{fv,iv,uiv}` y el `WebGLBackend` de Three pasa arrays comunes: resuelto con `patchExpoGLContext` (`src/render/webgl/makeWebGLRenderer.ts`).
2. Three evalúa `texture.image instanceof ImageBitmap` por frame y Hermes no define `ImageBitmap`: resuelto con un stub en `src/polyfills.ts`.
3. Con eso el backend compila los materiales TSL a GLSL y emite los draws (el overlay cuenta 2 draw calls y 13 triángulos), **pero la pantalla queda negra**. Si se fuerza un flush bloqueante por frame (`gl.flushEXP()` antes de `endFrameEXP()`, o el logging `GET_ERRORS` de expo-gl) el cubo se ve correcto, a costa de ~950 ms por frame en el Simulator. Hipótesis para el Hito 7: el lote de comandos de expo-gl se procesa en el hilo GL más lento de lo que R3F lo alimenta (la cola crece y nunca presenta), o el pase de salida de Three (render target interno + triángulo a pantalla) interactúa mal con el framebuffer por defecto de expo-gl. `fenceSync`/`clientWaitSync` no están implementadas en expo-gl, pero este camino no las usa.
4. Si el Hito 7 no lo resuelve, la alternativa es `WebGLRenderer` clásico (`three/build/three.module.js` por un alias aparte, aceptando dos copias de Three y materiales duplicados), o descartar el plan B si WebGPU rinde en dispositivo.

## Pendiente

- Hito 7: resolver o descartar el plan B (punto 3 de arriba) y medir en dispositivo real; las métricas del Simulator no valen para decidir.
- Android no está medido; `react-native-webgpu` sube `minSdk` a 26 por plugin.
