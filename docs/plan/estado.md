# Estado de la Fase 0

Actualizado por la sesión `planner` al cerrar cada hito. Fuente de verdad del avance.

| Hito | Tema                 | Dificultad | Sesión   | Estado    | Commit                          | Fecha      |
| ---- | -------------------- | ---------- | -------- | --------- | ------------------------------- | ---------- |
| 0    | Bootstrap del repo   | Bajo       | low-dev  | Hecho     | `1c11fee`                       | 2026-10-18 |
| 1    | Monorepo y tooling   | Bajo       | low-dev  | Hecho     | `24c84f6`, `0d4a39b`, `267e7d5` | 2026-10-18 |
| 2    | `packages/shared`    | Bajo       | low-dev  | Hecho     | `29ca6d7`, `51caac9`, `264cca2` | 2026-10-18 |
| 3    | `packages/game-core` | Medio      | mid-dev  | Pendiente | —                               | —          |
| 4    | Supabase             | Medio      | mid-dev  | Pendiente | —                               | —          |
| 5    | Landing              | Medio      | mid-dev  | Pendiente | —                               | —          |
| 6    | App mobile base      | Alto       | high-dev | Pendiente | —                               | —          |
| 7    | Spike de render      | Alto       | high-dev | Pendiente | —                               | —          |
| 8    | Blockout en Blender  | Alto       | high-dev | Pendiente | —                               | —          |
| 9    | Recorrido caminable  | Alto       | high-dev | Pendiente | —                               | —          |
| 10   | Genex                | Medio      | mid-dev  | Pendiente | —                               | —          |
| 11   | CI                   | Medio      | mid-dev  | Pendiente | —                               | —          |
| —    | Cierre               | Bajo       | low-dev  | Pendiente | —                               | —          |

## Prerrequisitos de máquina

| Herramienta            | Estado (2026-10-18)             |
| ---------------------- | ------------------------------- |
| Node 24.20.0           | Instalado                       |
| pnpm 12.14.0           | Instalado (Hito 0)              |
| Xcode 27.1             | Instalado                       |
| Blender 5.2.2 LTS      | Instalado                       |
| OrbStack / Docker 29.8 | Instalado                       |
| gh (nhsiciliano)       | Autenticado                     |
| Cuenta expo.dev        | Pendiente de confirmar (Hito 6) |
| Login Genex            | Pendiente (Hito 10)             |

## Decisiones pendientes del usuario

- Bundle id / package name (propuesto `ar.com.apocalipticba.app`).
- Firma local con Apple ID gratuito para medir en iPhone 13/14 real.
- Confirmación de costo del lote Genex.
- Proyecto Supabase staging (opcional).
