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

El login lo hace cada persona con su cuenta de Expo (nunca se guardan credenciales en el repo):

```sh
cd apps/mobile
pnpm exec eas login
pnpm exec eas build:configure            # una sola vez: vincula el proyecto (agrega extra.eas.projectId a app.json)
pnpm exec eas build --profile development-simulator --platform ios
```

Al terminar, EAS deja un `.tar.gz` con el `.app`. Para instalarlo en el Simulator:

```sh
tar -xzf build-XXXX.tar.gz
xcrun simctl boot "iPhone 17"            # o el que tengas
xcrun simctl install booted ApocalipticBA.app
xcrun simctl launch booted ar.com.apocalipticba.app
```

Builds locales (`expo run:ios` o `eas build --local`) necesitan CocoaPods, que no está instalado en la máquina de desarrollo; por eso el camino por defecto es EAS en la nube.

## Estado de cada backend

| Backend                             | Implementación                                                                    | Estado                                       |
| ----------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| WebGPU (react-native-webgpu 0.16.1) | `WebGPURenderer` sobre `Canvas` + `context.present()`; R3F con `createRoot`       | Pendiente de verificar en el Simulator (EAS) |
| WebGL 2 (expo-gl 58)                | El mismo `WebGPURenderer` con `forceWebGL: true` sobre `GLView` + `endFrameEXP()` | Pendiente de verificar en el Simulator (EAS) |

Lo que sí está verificado en esta máquina: lint, typecheck y tests en verde; el bundle Metro de iOS se exporta (una sola copia de Three r186 en su build WebGPU, R3F en el bundle web, sin `WebGLRenderer` legacy, polyfill de `TextDecoder` incluido) y `expo prebuild` aplica los plugins (orientación landscape, `UIRequiresFullScreen`, Metal API Validation desactivada en el scheme para el Simulator).

## Pendiente

- Confirmar en el Simulator el cubo girando en los dos backends y las métricas del overlay.
- Medir en dispositivo real (Hito 7); las métricas del Simulator no valen para decidir.
- Android no está medido; `react-native-webgpu` sube `minSdk` a 26 por plugin.
