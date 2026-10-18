# Versiones fijadas del stack

Verificadas el 2026-10-18 contra el registro de npm y la documentación oficial. Toda dependencia se fija con versión exacta (o el rango `~` que impone Expo para sus paquetes). Antes de agregar o actualizar una librería, consultar su documentación vigente vía Context7 y actualizar esta tabla.

## Runtime y gestores

| Herramienta | Versión | Nota |
|---|---|---|
| Node | 24.20.0 | Expo 58 exige `^24.3`; Astro 7 exige `>=22.22` |
| pnpm | 12.14.0 | Node 24 no trae corepack: `npm i -g pnpm@12.14.0` |
| Turborepo | 2.11.9 | |
| TypeScript | ~6.0.3 | La que usa el template oficial de Expo 58. No usar TS 7 (tsgo) todavía |
| Xcode | 27.1 | Instalado |
| Blender | 5.2.2 LTS | Soporte hasta julio 2028. Solo Apple Silicon |
| Docker (OrbStack) | 29.8.2 | Para Supabase local |

## Mobile

| Paquete | Versión | Nota |
|---|---|---|
| expo | ~58.0.14 | React Native 0.88.0, React 19.3.0, `@types/react` ~19.3.0 |
| expo-router | ~58.0.23 | |
| expo-dev-client | ~58.0.14 | |
| expo-gl | ~58.0.3 | Plan B de render |
| expo-haptics / expo-audio / expo-sensors / expo-screen-orientation / expo-keep-awake | 58.0.7 / 58.0.9 / 58.0.4 / 58.0.3 / 58.0.3 | |
| expo-asset / expo-file-system | 58.0.16 / 58.0.9 | Peers de R3F nativo |
| react-native-reanimated | 4.7.1 | Peer de react-native-webgpu |
| react-native-worklets | 0.13.0 | Peer de react-native-webgpu |
| react-native-gesture-handler | ~3.3.0 | Versión del template Expo 58 |
| **react-native-webgpu** | 0.16.1 | Reemplaza a `react-native-wgpu` (deprecado). New Architecture obligatoria. Android minSdk 26 |
| three / @types/three | 0.186.1 / 0.186.0 | Importar siempre desde `three/webgpu` y `three/tsl` |
| @react-three/fiber | 9.8.2 | Necesita patch de `package.json` (`"react-native"` → bundle web) con `patch-package` |
| three-mesh-bvh | 0.9.16 | |
| miniplex | 2.0.0 | |
| zustand | 5.0.15 | |
| @tanstack/react-query | 5.104.4 | |
| react-native-mmkv | 4.3.2 | Alternativa: expo-sqlite 58.0.13 |
| fast-text-encoding | última | Polyfill de `TextDecoder` para Hermes |
| eas-cli | 25.2.0 | Como devDependency |

## Landing

| Paquete | Versión | Nota |
|---|---|---|
| astro | 7.4.0 | Vite 8, compilador Rust (más estricto con HTML inválido) |
| @tailwindcss/vite / tailwindcss | 4.3.3 | No usar `@astrojs/tailwind` (solo para Tailwind 3) |
| @playwright/test | 1.64.1 | |

## Backend

| Paquete | Versión | Nota |
|---|---|---|
| supabase (CLI, npm) | 2.121.0 | Edge runtime embebido; Postgres necesita Docker |
| @supabase/supabase-js | 2.118.0 | |

## Calidad y tooling

| Paquete | Versión |
|---|---|
| zod | 4.6.7 |
| vitest | 5.0.5 |
| eslint | 10.13.0 |
| typescript-eslint | 8.71.2 |
| prettier | 3.9.10 |
| @gltf-transform/cli | 4.5.1 |

## Assets

| Herramienta | Versión | Nota |
|---|---|---|
| Genex CLI | 1.36.9 | `npx @genex-ai/cli-demo@latest tools`. 1 crédito = USD 0,01 |

## Restricciones de Hermes que condicionan el pipeline

- No ejecuta WebAssembly: sin KTX2 (Basis), sin meshopt, sin físicas WASM. Draco solo en modo asm.js.
- `GLTFLoader` no puede crear `Blob` desde `ArrayBuffer`: los GLB con texturas embebidas no cargan. Exportar `.gltf` + `.bin` + texturas externas.
- No provee `TextDecoder`: usar `fast-text-encoding` como primer import.
