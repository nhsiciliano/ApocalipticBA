# Estado de la Fase 0

Actualizado por la sesión `planner` al cerrar cada hito. Fuente de verdad del avance.

| Hito | Tema                 | Dificultad | Sesión   | Estado    | Commit                                                                   | Fecha      |
| ---- | -------------------- | ---------- | -------- | --------- | ------------------------------------------------------------------------ | ---------- |
| 0    | Bootstrap del repo   | Bajo       | low-dev  | Hecho     | `1c11fee`                                                                | 2026-10-18 |
| 1    | Monorepo y tooling   | Bajo       | low-dev  | Hecho     | `24c84f6`, `0d4a39b`, `267e7d5`                                          | 2026-10-18 |
| 2    | `packages/shared`    | Bajo       | low-dev  | Hecho     | `29ca6d7`, `51caac9`, `264cca2`                                          | 2026-10-18 |
| 3    | `packages/game-core` | Medio      | mid-dev  | Hecho     | `a1973a3`…`2d572b0` (6 commits)                                          | 2026-10-18 |
| 4    | Supabase             | Medio      | mid-dev  | Hecho     | `f7ea514`…`025f422` (8 commits)                                          | 2026-10-19 |
| 5    | Landing              | Medio      | mid-dev  | Pospuesto | — (decisión del usuario, 2026-10-19: la landing no es necesaria todavía) | —          |
| 6    | App mobile base      | Alto       | high-dev | Hecho     | `1a09ede`…`9f0345c` (9 commits)                                          | 2026-10-19 |
| 7    | Spike de render      | Alto       | high-dev | Hecho     | `f05a119`…`b73fcc3` (5 commits)                                          | 2026-10-20 |
| 8    | Blockout en Blender  | Alto       | high-dev | Pendiente | —                                                                        | —          |
| 9    | Recorrido caminable  | Alto       | high-dev | Pendiente | —                                                                        | —          |
| 10   | Genex                | Medio      | mid-dev  | Pendiente | —                                                                        | —          |
| 11   | CI                   | Medio      | mid-dev  | Pendiente | —                                                                        | —          |
| —    | Cierre               | Bajo       | low-dev  | Pendiente | —                                                                        | —          |

## Stand by (desde 2026-10-20)

El proyecto queda **en pausa** con los Hitos 0–4, 6 y 7 hechos y el 5 pospuesto. Motivo: la Mac Air M1 no da abasto en disco y rendimiento (Simulator, Supabase en Docker, Blender, Metro). Se retoma en una Mac más potente. Todo lo necesario está en `origin/main`; nada local es irrecuperable.

### Cómo reanudar en la máquina nueva

1. Instalar Node 24.20.0 (`.nvmrc`), `npm i -g pnpm@12.14.0`, Xcode (con runtime de iOS Simulator), OrbStack o Docker, Blender 5.2.2 LTS, `gh` autenticado. Opcional pero recomendado: CocoaPods, para `expo run:ios` y firma local con Apple ID gratuito en el iPhone 13/14.
2. `gh repo clone nhsiciliano/ApocalipticBA && cd ApocalipticBA && pnpm install`.
3. `cp supabase/.env.example supabase/.env` y completar `RATE_LIMIT_SALT` (cualquier string aleatorio). `pnpm db:start` baja las imágenes de Supabase (~8 GB).
4. `pnpm lint && pnpm typecheck && pnpm test && pnpm format` tienen que dar verde (Hito 7: 280 tests).
5. Mobile: `pnpm --filter @apocalipticba/mobile exec eas login`, después `eas build --profile development-simulator --platform ios` (el proyecto ya está vinculado en `app.json`). Instalación y deep links en `docs/mobile/README.md`.
6. Seguir por el **Hito 8** (blockout en Blender) según `docs/plan/fase-0.md`; la sesión `planner` arranca leyendo este archivo, `docs/prompt-base.md` (sección 8-bis) y los ADR.

### Qué se borró de la máquina vieja

Carpeta del proyecto (1,1 GB, casi todo `node_modules`), imágenes y volúmenes de Supabase en Docker, store y caché de pnpm, caché de npm, DerivedData de Xcode y el scratchpad de las sesiones. Nada de eso tenía estado propio: el único archivo local no versionado era `supabase/.env` (se regenera del `.env.example`).

## Prerrequisitos de máquina

| Herramienta            | Estado (2026-10-18)                                                 |
| ---------------------- | ------------------------------------------------------------------- |
| Node 24.20.0           | Instalado                                                           |
| pnpm 12.14.0           | Instalado (Hito 0)                                                  |
| Xcode 27.1             | Instalado                                                           |
| Blender 5.2.2 LTS      | Instalado                                                           |
| OrbStack / Docker 29.8 | Instalado                                                           |
| gh (nhsiciliano)       | Autenticado                                                         |
| Cuenta expo.dev        | Logueada (Hito 6): proyecto `@nhsiciliano/apocalipticba`, plan free |
| Login Genex            | Pendiente (Hito 10)                                                 |

## Deuda técnica y pendientes entre hitos

- `shared`: actualizar `src/db/README.md` (ya no es placeholder: se regenera con `pnpm db:types` con el stack arriba) (Bajo, low-dev, junto al cierre).
- `shared`: exportar `./fixtures` para que game-core no importe el fixture por ruta relativa (Bajo, low-dev, junto al cierre).
- Render: plan B WebGL descartado para la Fase 0 (Hito 7, ADR-002). `GLCanvas` y los shims de expo-gl quedan en el código documentados; se reabre solo si expo-gl corrige `bufferSubData`/la presentación asíncrona.
- Render: el heap de Hermes crece de 36 a 116 MB al remontar el `GameCanvas` 10 veces (sin leak nativo). Perfilar antes del Hito 9 o cuando haya iPhone real.
- Assets: relevar KTX1/ASTC (sin WASM) para texturas antes del lote de Genex (Hito 10); los jpg de 1024 px ocupan ~5,6 MB de GPU cada uno.
- Assets: `packages/assets/package.json` declara `spike:soldier` → `scripts/convert-soldier.mjs`, pero el script no se commiteó; los comandos de conversión están en `packages/assets/dist/spike/README.md` (Bajo, low-dev, junto al cierre).
- Assets: `packages/assets/dist/spike/soldier*` es el `Soldier` de three (Mixamo) como placeholder; se reemplaza por el zombie de Genex y se borra al cerrar la Fase 0 (licencia Mixamo: no redistribuir como asset suelto).
- Render: si el iPhone 13/14 no llega a 30 fps en `medium` con 30 zombies, probar skinning por compute + `InstancedMesh` (ejemplo `webgpu_skinning_instancing`) antes de tocar el backend.
- Mobile: sin CocoaPods en la máquina, no hay builds locales (`expo run:ios`); todo pasa por EAS Build (plan free, ~8 min + cola). Las mediciones del Hito 7 en iPhone real requieren firma local, que sí necesita CocoaPods.
- Hito 9: evaluar si la latencia de un step entre `commitMove` y triggers/pickups molesta; si sí, agregar `resolveMove` síncrono.
- Fase 1: el botiquín se acumula pero no cura (falta API de curación).
- Fase 2 (Supabase): lógica real de los tres stubs, Google/Apple auth, telemetría vía función, evaluar `@supabase/server` con `verify_jwt = false`, confirmar bundling de `functions deploy` con el import map (fallback de copia en ADR-007).
- Desarrollo local: `supabase start` necesita `supabase/.env` (copiar de `.env.example`) para que `waitlist-signup` arranque (`RATE_LIMIT_SALT` obligatoria).

## Decisiones pendientes del usuario

- Bundle id / package name (propuesto `ar.com.apocalipticba.app`).
- Firma local con Apple ID gratuito para medir en iPhone 13/14 real (requiere CocoaPods; el usuario decidió no instalarlo por ahora, 2026-10-20: el Hito 7 mide solo en Simulator).
- Confirmación de costo del lote Genex.
- Proyecto Supabase staging (opcional).
