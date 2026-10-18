# ApocalipticBA

FPS de zombies mobile ambientado en Buenos Aires, para iOS y Android. Un meteorito cae sobre la ciudad y el primer escenario es Constitución: estación, plaza e iglesia.

La app usa Expo y Three.js con WebGPU, con un estilo visual de cel-shading estilo cómic. La landing (Astro) presenta el juego y recibe la lista de espera, y el backend es Supabase.

## Requisitos

| Herramienta       | Versión                | Nota                                                   |
| ----------------- | ---------------------- | ------------------------------------------------------ |
| Node              | 24.20.0 (`.nvmrc`)     | Expo 58 exige `^24.3`                                  |
| pnpm              | 12.14.0                | Node 24 no trae corepack: `npm i -g pnpm@12.14.0`      |
| Xcode             | 27 o superior          | Para el iOS Simulator, aunque los builds salgan de EAS |
| Blender           | 5.2 LTS (5.2.2)        | Editor de niveles, solo Apple Silicon                  |
| OrbStack o Docker | Docker 29 o superior   | Para Supabase local                                    |
| Supabase CLI      | devDependency (Hito 4) | Se ejecuta con `pnpm exec supabase`                    |
| EAS CLI           | devDependency (Hito 6) | Se ejecuta con `pnpm exec eas`                         |

Las versiones exactas de todo el stack están en [`docs/tooling/versiones.md`](docs/tooling/versiones.md).

## Instalación

```sh
nvm use          # o el gestor de versiones de Node que uses
pnpm install
```

## Scripts

Se ejecutan desde la raíz.

| Script                 | Qué hace                                                                  |
| ---------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`             | `turbo run dev`: levanta en modo desarrollo los paquetes que lo definen   |
| `pnpm build`           | `turbo run build`: compila todo en orden de dependencias, con caché       |
| `pnpm lint`            | `turbo run lint`: ESLint en todos los paquetes                            |
| `pnpm typecheck`       | `turbo run typecheck`: TypeScript estricto en todos los paquetes          |
| `pnpm test`            | `turbo run test`: tests de todos los paquetes                             |
| `pnpm format`          | `prettier --check .`: verifica el formato                                 |
| `pnpm format:write`    | `prettier --write .`: formatea                                            |
| `pnpm level:export`    | Exporta los niveles desde Blender (llega en el Hito 8)                    |
| `pnpm level:validate`  | Valida los niveles contra `scenario.json` (llega en el Hito 8)            |
| `pnpm assets:optimize` | Optimiza los assets hacia `packages/assets/dist` (llega en el Hito 8)     |
| `pnpm db:start`        | Levanta Supabase local (llega en el Hito 4)                               |
| `pnpm db:reset`        | Recrea la base local desde las migraciones y el seed (llega en el Hito 4) |
| `pnpm db:types`        | Genera los tipos de la base (llega en el Hito 4)                          |

Los scripts marcados con un hito fallan con un mensaje claro hasta que existe el paquete correspondiente.

## Estructura

```
apocalipticba/
├─ apps/
│  ├─ landing/        # Astro (presentación + waitlist)
│  └─ mobile/         # Expo: render, escenas, HUD, input, audio
├─ packages/
│  ├─ game-core/      # Lógica pura del juego (sin render ni APIs nativas)
│  ├─ shared/         # Tipos, esquemas Zod, constantes, cliente de backend, tipos de DB
│  ├─ assets/         # raw/ (Genex + exportaciones de Blender) y dist/ (optimizados)
│  └─ config/         # tsconfig, eslint, prettier compartidos
├─ levels/
│  └─ escenario-01/   # escenario-01.blend + scripts bpy
├─ scenarios/
│  └─ escenario-01/   # scenario.json
├─ supabase/          # migraciones, seeds, Edge Functions, config local
├─ tools/             # scripts: level-export, assets-optimize, validadores
├─ docs/
│  ├─ decisions/      # ADRs
│  ├─ references/     # referencias visuales (uso interno)
│  └─ spikes/         # informes de spikes técnicos
├─ AGENTS.md
├─ turbo.json
└─ pnpm-workspace.yaml
```

Hoy existen `packages/config`, `tools/` y `docs/`; el resto llega con cada hito.

## Documentación

- [`docs/README.md`](docs/README.md): índice de la documentación.
- [`docs/plan/fase-0.md`](docs/plan/fase-0.md): plan de la Fase 0 con hitos y dificultad.
- [`docs/decisions/`](docs/decisions/README.md): decisiones de arquitectura (ADRs).
- [`AGENTS.md`](AGENTS.md): reglas para quien trabaje en el repo, personas o agentes.

## Estado

**Fase 0 en curso** (fundaciones, spike de render y blockout del Escenario 1). El avance por hito está en [`docs/plan/estado.md`](docs/plan/estado.md).
