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
| 7    | Spike de render      | Alto       | high-dev | En curso  | —                                                                        | 2026-10-20 |
| 8    | Blockout en Blender  | Alto       | high-dev | Pendiente | —                                                                        | —          |
| 9    | Recorrido caminable  | Alto       | high-dev | Pendiente | —                                                                        | —          |
| 10   | Genex                | Medio      | mid-dev  | Pendiente | —                                                                        | —          |
| 11   | CI                   | Medio      | mid-dev  | Pendiente | —                                                                        | —          |
| —    | Cierre               | Bajo       | low-dev  | Pendiente | —                                                                        | —          |

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
- Hito 7: el plan B WebGL (expo-gl + `WebGPURenderer` con `forceWebGL`) compila y emite draws pero la pantalla queda negra salvo con flush bloqueante por frame (~950 ms/frame en Simulator). Hipótesis y alternativas en `docs/mobile/README.md` y ADR-008: `WebGLRenderer` clásico por alias aparte (dos copias de Three) o descartar el plan B si WebGPU rinde en dispositivo.
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
