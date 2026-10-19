# Versiones fijadas del stack

Verificadas el 2026-10-18 contra el registro de npm y la documentación oficial (filas de Mobile revisadas el 2026-10-19 al armar `apps/mobile`). Toda dependencia se fija con versión exacta (o el rango `~` que impone Expo para sus paquetes). Antes de agregar o actualizar una librería, consultar su documentación vigente vía Context7 y actualizar esta tabla.

## Runtime y gestores

| Herramienta       | Versión   | Nota                                                                   |
| ----------------- | --------- | ---------------------------------------------------------------------- |
| Node              | 24.20.0   | Expo 58 exige `^24.3`; Astro 7 exige `>=22.22`                         |
| pnpm              | 12.14.0   | Node 24 no trae corepack: `npm i -g pnpm@12.14.0`                      |
| Turborepo         | 2.11.9    |                                                                        |
| TypeScript        | ~6.0.3    | La que usa el template oficial de Expo 58. No usar TS 7 (tsgo) todavía |
| Xcode             | 27.1      | Instalado                                                              |
| Blender           | 5.2.2 LTS | Soporte hasta julio 2028. Solo Apple Silicon                           |
| Docker (OrbStack) | 29.8.2    | Para Supabase local                                                    |

## Mobile

| Paquete                                                                              | Versión                                    | Nota                                                                                                                                  |
| ------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| expo                                                                                 | ~58.0.14                                   | React Native 0.88.0, React 19.3.0, `@types/react` 19.3.0                                                                              |
| expo-router                                                                          | ~58.0.23                                   | Peers: expo-constants 58.0.12, expo-linking 58.0.13, react-native-screens 4.30.0, react-native-safe-area-context 5.10.1               |
| expo-dev-client                                                                      | ~58.0.14                                   |                                                                                                                                       |
| expo-gl                                                                              | ~58.0.3                                    | Plan B de render                                                                                                                      |
| expo-status-bar                                                                      | 58.0.3                                     |                                                                                                                                       |
| expo-haptics / expo-audio / expo-sensors / expo-screen-orientation / expo-keep-awake | 58.0.7 / 58.0.9 / 58.0.4 / 58.0.3 / 58.0.3 | En Hito 6 solo se instaló expo-screen-orientation                                                                                     |
| expo-asset / expo-file-system                                                        | 58.0.16 / 58.0.9                           | Peers opcionales de R3F; instalados para fijar versión                                                                                |
| babel-preset-expo                                                                    | ~58.0.17                                   | devDependency: `babel.config.js` explícito (incluye el plugin de worklets)                                                            |
| react-native-reanimated                                                              | 4.7.1                                      | Peer de react-native-webgpu                                                                                                           |
| react-native-worklets                                                                | 0.13.0                                     | Peer de react-native-webgpu                                                                                                           |
| react-native-gesture-handler                                                         | ~3.3.0                                     | Versión del template Expo 58                                                                                                          |
| react-native-screens / react-native-safe-area-context                                | 4.30.0 / 5.10.1                            | Peers de expo-router                                                                                                                  |
| **react-native-webgpu**                                                              | 0.16.1                                     | Reemplaza a `react-native-wgpu` (deprecado). New Architecture obligatoria. Android minSdk 26. Existe 0.17.0 (2026-10-18), no adoptada |
| @webgpu/types                                                                        | 0.1.65                                     | Tipos globales `GPU*` que referencia react-native-webgpu (`types` en tsconfig)                                                        |
| three / @types/three                                                                 | 0.186.1 / 0.186.0                          | Importar siempre desde `three/webgpu` y `three/tsl`. `three.webgpu.js` no exporta `WebGLRenderer`                                     |
| @react-three/fiber                                                                   | 9.8.2                                      | Sin patch: Metro lo resuelve al bundle web con `mainFields: ['module']` (ADR-008)                                                     |
| three-mesh-bvh                                                                       | 0.9.16                                     |                                                                                                                                       |
| miniplex                                                                             | 2.0.0                                      |                                                                                                                                       |
| zustand                                                                              | 5.0.15                                     |                                                                                                                                       |
| @tanstack/react-query                                                                | 5.104.4                                    |                                                                                                                                       |
| react-native-mmkv                                                                    | 4.3.2                                      | Alternativa: expo-sqlite 58.0.13                                                                                                      |
| react-native-nitro-modules                                                           | 0.37.1                                     | Peer de react-native-mmkv 4 (MMKV 4.3.2 se publicó contra 0.35.9; 0.37.1 es la vigente para RN 0.88)                                  |
| fast-text-encoding                                                                   | 1.0.6                                      | Polyfill de `TextDecoder` para Hermes; primer import en `index.ts`                                                                    |
| eslint-plugin-react-hooks                                                            | 7.1.1                                      | Soporta ESLint 10. `eslint-plugin-react` 7.37.5 no (usa `context.getFilename`): no se usa                                             |
| eas-cli                                                                              | 25.2.0                                     | Como devDependency (`pnpm exec eas`)                                                                                                  |

## Landing

| Paquete                         | Versión | Nota                                                     |
| ------------------------------- | ------- | -------------------------------------------------------- |
| astro                           | 7.4.0   | Vite 8, compilador Rust (más estricto con HTML inválido) |
| @tailwindcss/vite / tailwindcss | 4.3.3   | No usar `@astrojs/tailwind` (solo para Tailwind 3)       |
| @playwright/test                | 1.64.1  |                                                          |

## Backend

| Paquete               | Versión | Nota                                                                                                                                                                    |
| --------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| supabase (CLI, npm)   | 2.121.0 | Edge runtime embebido; Postgres necesita Docker. Binario como paquete opcional por plataforma (sin postinstall). Trae Postgres 17.11 y edge-runtime 1.77.4 (Deno 2.1.4) |
| @supabase/supabase-js | 2.118.0 | Tests de RLS en Node; en Deno vía `npm:` en `supabase/functions/deno.json`                                                                                              |

## Calidad y tooling

| Paquete                | Versión                                  |
| ---------------------- | ---------------------------------------- |
| zod                    | 4.6.7                                    |
| vitest                 | 5.0.5                                    |
| eslint                 | 10.13.0                                  |
| typescript-eslint      | 8.71.2                                   |
| prettier               | 3.9.10                                   |
| @eslint/js             | 10.0.1                                   |
| eslint-config-prettier | 10.1.8                                   |
| eslint-plugin-import-x | 4.17.1                                   |
| globals                | 17.13.0                                  |
| @types/node            | 24.19.2 (alineado a Node 24, no la 26.x) |
| @gltf-transform/cli    | 4.5.1                                    |

Nota pnpm 12: `.npmrc` solo se usa para auth/registry. `engineStrict`, `autoInstallPeers` y `allowBuilds` viven en `pnpm-workspace.yaml`. Todo paquete con script de build (esbuild, sharp, etc.) necesita una entrada explícita en `allowBuilds` o la instalación falla. Hoy están listados en `false` (no se ejecutan) `unrs-resolver`, y `dtrace-provider` y `protobufjs`, que arrastra `eas-cli`.

## Assets

| Herramienta | Versión | Nota                                                        |
| ----------- | ------- | ----------------------------------------------------------- |
| Genex CLI   | 1.36.9  | `npx @genex-ai/cli-demo@latest tools`. 1 crédito = USD 0,01 |

## Restricciones de Hermes que condicionan el pipeline

- No ejecuta WebAssembly: sin KTX2 (Basis), sin meshopt, sin físicas WASM. Draco solo en modo asm.js.
- `GLTFLoader` no puede crear `Blob` desde `ArrayBuffer`: los GLB con texturas embebidas no cargan. Exportar `.gltf` + `.bin` + texturas externas.
- No provee `TextDecoder`: usar `fast-text-encoding` como primer import.
