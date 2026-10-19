# ADR-008 — Estructura de la app mobile (Expo Router, Metro, GameCanvas dual, ajustes)

- **Estado:** Aceptado (el plan B WebGL queda pendiente de verificación en el Simulator)
- **Fecha:** 2026-10-19

## Contexto

El Hito 6 arma `apps/mobile`: Expo 58 (React Native 0.88, React 19.3) dentro del monorepo pnpm 12 con instalación aislada, navegación placeholder y el `GameCanvas` dual que pide ADR-002 (WebGPU con plan B en WebGL). Al verificar la documentación vigente (Context7 y el template oficial `apps/expo-webgpu` de react-native-webgpu) varias premisas del plan cambiaron:

- El template oficial de Expo de react-native-webgpu **ya no parchea `@react-three/fiber`**: resuelve el paquete desde Metro con `mainFields: ['module']` para que, en nativo, se use el bundle web (ESM) en lugar del bundle `react-native` atado a `WebGLRenderer`.
- `three/build/three.webgpu.js` **no exporta `WebGLRenderer`**: solo `WebGPURenderer` y `WebGLBackend`. Con el alias `three` → `three.webgpu.js` que exige WebGPU, el plan B no puede ser `WebGLRenderer`.
- El bundle nativo de R3F (`@react-three/fiber/native`) es una copia separada del reconciler: si conviviera con el bundle web en el mismo bundle Metro, `useFrame` y `useThree` no compartirían contexto entre las dos rutas.
- `eslint-plugin-react` 7.37.5 todavía no corre en ESLint 10 (`context.getFilename` fue eliminado).
- Expo 58 sigue necesitando CocoaPods para builds locales de iOS; en esta máquina no está instalado, así que la verificación en el Simulator depende de EAS Build.

## Decisión

1. **Expo Router con entrada propia.** `package.json#main` apunta a `index.ts`, que importa `fast-text-encoding` (Hermes no trae `TextDecoder`) y después `expo-router/entry`. Las pantallas viven en `app/` (una por ruta de `src/navigation/routes.ts`, sin typed routes para no depender de `.expo/types` generado). Sin `babel.config.js` propio salvo `babel-preset-expo`, que ya incluye el plugin de worklets.
2. **Metro.** `metro.config.js` deja la configuración de monorepo a `expo/metro-config` (SDK 52+ la resuelve sola, también con pnpm aislado) y agrega: alias `three`, `three/webgpu` → `build/three.webgpu.js` y `three/tsl` → `build/three.tsl.js` (una sola copia de las clases base, también para el `import 'three'` de R3F); `three/addons/*` → `examples/jsm/*`; `@react-three/fiber` resuelto con `mainFields: ['module']` fuera de web; `assetExts` + `glb gltf bin hdr`. **No hay patch** de R3F (ni `patch-package` ni `pnpm patch`): la resolución desde Metro hace lo mismo sin archivo que mantener.
3. **`GameCanvas` dual sobre un solo R3F.** `src/render/fiberRoot.ts` monta R3F con `createRoot` del bundle web sobre una superficie nativa; los dos backends solo cambian la superficie y el renderer:
   - `webgpu/FiberCanvas.tsx`: `Canvas` de react-native-webgpu, `WebGPURenderer` y `context.present()` después de cada `render`.
   - `webgl/GLCanvas.tsx`: `GLView` de expo-gl y **el mismo `WebGPURenderer` con `forceWebGL: true`** (backend WebGL 2 de Three) sobre el contexto de expo-gl, con `gl.endFrameEXP()` después de cada `render`. Así los materiales TSL sirven en ambos (ADR-005).
   - El renderer se entrega a R3F por factory, de modo que R3F es su dueño y lo descarta en `unmount`; `GameCanvas` remonta por `key` al cambiar el backend. `dpr: 1` fijo y tamaño en píxeles físicos (evita `matchMedia`, que no existe en React Native).
   - `ensureThreeCatalogue()` registra el namespace de `three/webgpu` como JSX una sola vez; `@react-three/fiber/native` y el import de `three` a secas quedan prohibidos por ESLint.
4. **Ajustes persistidos.** Zustand 5 `persist` + `createJSONStorage` sobre un adaptador de MMKV 4 (`createMMKV({ id: 'settings' })`). El store se crea con una factory que recibe el `StateStorage`: la app usa MMKV y los tests un store en memoria. Lo persistido se valida al rehidratar (`merge`), con `version` para migraciones.
5. **Overlay de debug.** `StatsSampler` (dentro del root de R3F) lee `renderer.info` por frame y publica fps, frame time, draw calls y triángulos cada 500 ms en un store aparte; `DebugOverlay` lo muestra junto al backend activo y la calidad (`QUALITY_LEVELS` de `shared`).
6. **Tooling.** `tsconfig.json` extiende `@apocalipticba/config/tsconfig.react-native.json` y después `expo/tsconfig.base` (array de `extends`; el segundo aporta `customConditions`, `lib` DOM y `module: preserve` sin tocar el preset compartido). ESLint usa `createConfig` de `@apocalipticba/config` con `eslint-plugin-react-hooks` 7 (reglas del compilador incluidas) y sin `eslint-plugin-react`. Vitest cubre lo que corre en Node: backend, store, estadísticas y rutas.
7. **EAS.** `eas.json` con perfil `base` (Node 24.20.0, pnpm 12.14.0) y `development`, `development-simulator` (`ios.simulator: true`) y `preview`. `eas-cli` es devDependency (`pnpm exec eas`).

## Consecuencias

- Un solo reconciler de R3F y una sola copia de Three en el bundle; las escenas no saben qué backend las dibuja.
- El plan B depende de que el `WebGLBackend` de Three funcione sobre el contexto de expo-gl (extensiones, `drawingBufferWidth`, etc.). Es lo que mide el Hito 7; si falla, la alternativa es volver a `WebGLRenderer` importando `three/build/three.module.js` por un alias aparte, aceptando dos copias de Three.
- Metro resuelve `@react-three/fiber` por `mainFields`; si R3F agrega un mapa `exports`, el alias pasa a `unstable_conditionNames` o a un patch (ya contemplado en `allowBuilds`/`pnpm patch`).
- `react-native-mmkv` 4 arrastra `react-native-nitro-modules`; si el build nativo falla por Nitro con RN 0.88, la alternativa aprobada es `expo-sqlite` detrás del mismo `KeyValueStore`.
- Sin `eslint-plugin-react` se pierden `react/jsx-key` y similares; TypeScript estricto y las reglas de hooks cubren lo importante. Se revisa cuando el plugin soporte ESLint 10.
- Las pantallas de `app/` son placeholders: el HUD real y las pantallas de meta llegan con el Hito 9 y la Fase 1.

## Alternativas consideradas

- **`patch-package` / `pnpm patch` sobre R3F:** funciona, pero deja un archivo que hay que regenerar en cada actualización; la resolución desde Metro es la que usa el template oficial.
- **`Canvas` nativo de R3F (`@react-three/fiber/native`) para el plan B:** duplica el reconciler y rompe `useFrame` entre backends; además su `createRenderer` usa `THREE.WebGLRenderer`, que no existe en el build WebGPU.
- **`nodeLinker: hoisted`:** no hizo falta; `expo/metro-config` resolvió el monorepo con instalación aislada.
- **Typed routes de Expo Router:** dependen de `.expo/types`, que no está en git; se reemplazan por `ROUTES` tipado y un test que verifica que exista una pantalla por ruta.
