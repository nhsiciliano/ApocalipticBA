# AGENTS.md — Reglas del proyecto

Reglas operativas para cualquier agente (o persona) que trabaje en ApocalipticBA. Si algo de acá choca con una instrucción puntual de la tarea, frená y preguntá.

## Reglas duras

- **No destruir archivos ajenos.** Nunca borres, muevas, renombres ni sobrescribas archivos que no creaste vos. Eso incluye las referencias visuales, los `.blend` que edita el usuario y las reglas de este archivo. Ante la duda, preguntá.
- **Costos de Genex.** Antes de gastar créditos, informá el costo y esperá la confirmación del usuario. No regeneres assets existentes e integrá todo lo que se genere.
- **Referencias de terceros.** `docs/references/**` es de uso interno: no se publica (el repo es público) y no se usa como input de generación.
- **Fase 0.** No avances a la Fase 1 sin la aprobación del usuario. No avances de hito si el plan no lo indica.
- **Idioma.** Textos del juego en es-AR con voseo. Documentación en español rioplatense. Código, identificadores y mensajes de commit en inglés.

## Versiones fijadas

Todas las dependencias se fijan con versión exacta (salvo el rango `~` que impone Expo). La tabla vigente está en [`docs/tooling/versiones.md`](docs/tooling/versiones.md). Si agregás o actualizás una librería, actualizá esa tabla en el mismo commit.

## Antes de usar una librería

Consultá su documentación vigente vía Context7 (`resolve-library-id` y `query-docs`) antes de usar una API, aunque creas conocerla: el stack cambia rápido. Si Context7 contradice un documento del repo, seguí a Context7 y dejá constancia en el ADR o el reporte.

## Código

- TypeScript estricto en todo (`packages/config/tsconfig.base.json`): sin `any`, sin `@ts-ignore` salvo excepción justificada en un comentario.
- `game-core` es TypeScript puro: no importa Three.js, React ni APIs de Expo.
- Todo lo específico del renderer vive en `apps/mobile/src/render/`, detrás de `GameCanvas`.
- Three.js se importa desde `three/webgpu` y `three/tsl`; los materiales custom se escriben en TSL.
- Hermes no ejecuta WebAssembly: nada de KTX2, meshopt ni motores de física en WASM.
- Cada tarea termina con `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm format` en verde.

## Assets

- **La app consume solo `packages/assets/dist`.** Nunca importa desde `packages/assets/raw`.
- `packages/assets/raw/**` está ignorado por git, salvo `manifest.json` y los `.gitkeep`.
- Los niveles se exportan como `.gltf` + `.bin` + texturas externas, no como GLB con texturas embebidas.

## Niveles (Blender)

- Archivo `levels/escenario-01/escenario-01.blend`, con una colección por zona: `Z1_Hall`, `Z2_Plaza`, `Z3_Frente`, `Z4_Lateral`, `Z5_Interior`, `BG_Skyline`. Escala: 1 unidad = 1 m.
- Convención de nombres de objetos:

| Prefijo                 | Significado                           |
| ----------------------- | ------------------------------------- |
| `COL_`                  | Colisión (va al BVH, no se renderiza) |
| `COL_oneway_<id>`       | Bloqueo de un solo sentido            |
| `TRG_<id>`              | Trigger                               |
| `SPAWN_<encuentro>_<n>` | Punto de aparición                    |
| `PICK_<tipo>`           | Pickup                                |
| `INT_<tipo>_<id>`       | Interactuable                         |
| `CHK_<n>`               | Checkpoint                            |
| `NAV_`                  | Navmesh                               |

- Los datos extra van en custom properties (se exportan como glTF extras). `pnpm level:validate` cruza estos nombres con `scenario.json`.

## Commits

- [Conventional Commits](https://www.conventionalcommits.org/) en inglés: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, con alcance opcional (`feat(shared): ...`).
- Cuerpo opcional para explicar el porqué.
- Un commit atómico por cambio lógico. No mezcles tooling, código y documentación en el mismo commit.
- El último renglón del mensaje es el `Co-Authored-By` del modelo que escribió el cambio, por ejemplo `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Una decisión técnica relevante lleva su ADR en `docs/decisions/` antes o en el mismo commit.

## Genex

Reservado: el setup de Genex agrega sus reglas acá. No editar a mano.
