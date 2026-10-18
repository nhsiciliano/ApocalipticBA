# @apocalipticba/game-core

La simulación del juego, en TypeScript puro: loop de timestep fijo, ECS ([miniplex](https://github.com/hmans/miniplex) 2), movimiento del jugador y los sistemas de nivel data-driven que lee de `scenario.json` (objetivos, triggers, checkpoints, interactuables, oneways, pickups). Corre en Node y se prueba con Vitest.

No importa Three.js, React, Expo ni APIs nativas. Tampoco lee relojes ni usa `Math.random()`: el tiempo entra por `step(dt)` y el azar por un `Rng` con semilla, así que la misma entrada produce siempre los mismos eventos.

El host (`apps/mobile`, Hito 9) hace render, colisión contra el BVH, raycasts, input táctil, audio y persistencia, y habla con el core solo por la API de este paquete. El porqué del reparto está en [ADR-006](../../docs/decisions/ADR-006-contrato-host-core.md).

## Uso

```ts
import { parseScenario } from '@apocalipticba/shared';
import { createFixedStepLoop, createGame } from '@apocalipticba/game-core';

const game = createGame({
  scenario: parseScenario(scenarioJson),
  adapters: { input, storage, haptics, audio },
  settings: { locale: 'es-AR', lookSensitivity: 1.2 },
});

game.events.on('objective.changed', ({ text }) => hud.setObjective(text));
game.world.registerZoneNodes('Z1_Hall', nodesFromGltf(z1));

const loop = createFixedStepLoop({
  onStep: (dt) => {
    game.step(dt);
    const result = capsule.move(game.player.position, game.player.desiredDelta); // BVH del host
    game.player.commitMove(result);
  },
  onRender: (alpha) => renderer.render(interpolate(alpha)),
});
let last = performance.now(); // el reloj vive en el host, nunca en el core
requestAnimationFrame(function frame(now) {
  loop.advance(now - last);
  last = now;
  requestAnimationFrame(frame);
});
```

## Un paso de simulación

```text
host rAF ──► loop.advance(frameMs) ──► 0..maxSubSteps × game.step(1/60)
                                             │
  input.sample() ─────────────────────────────┤
                                             ▼
  1. movimiento   intent → yaw/pitch → velocidad → desiredDelta
                  (climbing: el core recorre el path; sin host: aplica el delta)
  2. triggers     AABB vs. eje de la cápsula → acciones
  3. oneways      cruzar COL_oneway_ → zone.unload (irreversible)
  4. pickups      radio → inventario
  5. interacción  candidato validado → note / locked / gate / pickup / hold / climb
  6. linterna     toggle si hay linterna
                                             │
  objetivos, checkpoints y fase reaccionan a las acciones en el mismo paso
                                             ▼
  events ──► HUD / host            player.desiredDelta ──► BVH ──► commitMove()
```

## Contrato host ↔ core

| Qué                  | Lo hace el host                                                                                                                   | Lo hace el core                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Tiempo               | Llama `loop.advance(ms)` desde su rAF; `step(dt)` en cada paso fijo                                                               | Simula con `dt` fijo; nunca lee relojes                                                                                |
| Movimiento           | Mueve la cápsula con `player.desiredDelta` contra el BVH y llama `player.commitMove({ position, grounded, hitCeiling? })`         | Calcula velocidad y delta. Hasta el primer `commitMove` aplica el delta directo con piso en la Y del spawn (tests)     |
| Zonas                | Al cargar una zona pasa sus nodos de gameplay a `world.registerZoneNodes(zone, nodes)`; responde a `zone.preload` / `zone.unload` | Valida los ids contra el escenario (lanza `Error` si no coinciden), crea las entidades y descarga zonas por oneways    |
| Zona actual          | Llama `world.setCurrentZone(zone)` al entrar a una zona                                                                           | Emite `zone.changed` y pide precargar las vecinas (`zone.preload`)                                                     |
| Interacción          | Raycast/proximidad contra nodos `INT_` → `interaction.setCandidate(id \| null)`                                                   | Valida existencia, carga, disponibilidad y `interactRange`; emite `interact.prompt` solo cuando cambia                 |
| Trepar               | Durante `phase: 'climbing'` ignora colisiones, no llama `commitMove` y copia `player.position` a la cámara                        | Recorre el `path` en `durationMs` y vuelve a `playing`                                                                 |
| Oneways              | Al recibir `oneway.crossed` activa la colisión del `COL_oneway_<id>`                                                              | Marca el cruce (persistido) y descarga `unloadZones`                                                                   |
| Muerte y reaparición | Muestra la pantalla de muerte y llama `player.respawn()`                                                                          | `player.damage(n)`; a 0 pasa a `dead`. `respawn()` restaura el último checkpoint (o el inicio)                         |
| Tras restaurar       | Al recibir `checkpoint.restored` relee `world.resolved` (pickups recogidos, puertas abiertas...) y `state`                        | Restaura inventario, flags, objetivo y consumidos; pide las zonas que hagan falta                                      |
| Persistencia         | Implementa `StorageAdapter` (MMKV o expo-sqlite)                                                                                  | Cada `checkpoint.save` persiste en `save:<scenario.id>`; `save()` / `load()` para el guardado manual y al abrir la app |

Convenciones: metros, Y hacia arriba, `player.position` son los pies (base de la cápsula), `yaw = 0` mira a -Z y crece girando a la izquierda (como `rotation.y` de Three.js con orden `YXZ`), `pitch` positivo mira hacia arriba (clamp ±89°). En `PlayerIntent`, `lookDeltaX > 0` gira a la derecha y `lookDeltaY > 0` mira hacia arriba (`invertY` lo da vuelta). Los rangos de pickup e interacción se miden desde el eje vertical de la cápsula, así un objeto a la altura del piso o de los ojos queda igual de cerca.

Los nodos de gameplay son: `trigger` y `oneway` con `aabb`; `spawn`, `checkpoint` y `marker` con `yaw` opcional; `pickup` e `interactable` con `radius` opcional (default 1 m). El resto del glTF (`COL_`, `NAV_`, geometría) no se registra. `expectedNodesForZone(scenario, zone)` dice qué ids espera cada zona.

## Eventos

Todos tipados en `GameEventMap`; los textos llegan resueltos al locale (`settings.locale`, con fallback a es-AR).

| Evento                              | Payload                                           |
| ----------------------------------- | ------------------------------------------------- |
| `objective.changed`                 | `{ id, text }`                                    |
| `objective.completed`               | `{ id }`                                          |
| `trigger.fired`                     | `{ id }`                                          |
| `checkpoint.saved`                  | `{ id }` (al tomar el snapshot)                   |
| `checkpoint.restored`               | `{ id }` (`null` = inicio del escenario)          |
| `encounter.start` / `encounter.end` | `{ id }` (en Fase 0 no hay spawner)               |
| `zone.changed`                      | `{ from, to }`                                    |
| `zone.preload` / `zone.unload`      | `{ zones }`                                       |
| `oneway.crossed`                    | `{ id, unloadZones }`                             |
| `note.opened`                       | `{ noteId, title, body }`                         |
| `note.closed`                       | `{ noteId }`                                      |
| `interact.prompt`                   | `{ id, prompt, kind }` o `null`                   |
| `interact.progress`                 | `{ id, progress }` (0..1, interacción hold)       |
| `interact.completed`                | `{ id }`                                          |
| `interact.locked`                   | `{ id, message }`                                 |
| `pickup.collected`                  | `{ pickupId, item, amount }`                      |
| `inventory.changed`                 | `{ item, amount }` (total nuevo)                  |
| `flag.changed`                      | `{ flag, value }`                                 |
| `flashlight.changed`                | `{ on }`                                          |
| `text.show`                         | `{ text, durationMs }`                            |
| `audio.play`                        | `{ cueId, loop }`                                 |
| `player.phase`                      | `{ phase }`                                       |
| `player.health`                     | `{ health, maxHealth }`                           |
| `player.died`                       | —                                                 |
| `player.respawned`                  | `{ checkpointId }`                                |
| `scenario.finished`                 | `{ summary: { timeMs, notesFound, notesTotal } }` |
| `debug.warn`                        | `{ message }` (diagnóstico, no es para el HUD)    |

## Reglas de los sistemas

- **Triggers:** disparan una vez por estadía, al entrar o mientras el jugador sigue adentro si recién se cumplen sus `requiresFlags`. `once: true` queda consumido y se guarda en el checkpoint; `once: false` se rearma al salir. Al restaurar un checkpoint, los triggers en los que ya está parado el jugador no disparan hasta que salga y vuelva a entrar.
- **Objetivos:** secuenciales. `objective.advance` y `objective.complete` completan el objetivo actual; un id fuera de orden se ignora con `debug.warn`. El último termina la partida (`finished` + `scenario.finished`).
- **Pickups:** las armas y la linterna valen 1; munición y botiquines se acumulan. Un pickup referenciado por un `INT_pickup_*` solo se recoge interactuando.
- **Interactuables:** `note` abre el visor (`reading_note`) y la primera lectura ejecuta `onRead`; `gate` exige todos sus `requiresItems`; `hold` avanza con `interactHeld`, ejecuta `onStart` una vez, conserva el progreso si es acumulativo y corta los loops de audio de `onStart` al completar; `climb` es guionado.
- **Checkpoints:** el snapshot (`CheckpointSnapshot`, versión 1) guarda posición, vida, inventario, flags, objetivo, pickups consumidos, oneways cruzados, puertas abiertas, sostenidas completadas, triggers disparados, notas encontradas y tiempo. Al reaparecer el reloj sigue corriendo; al cargar desde storage se restaura.

## Tests

```bash
pnpm --filter @apocalipticba/game-core test           # una pasada
pnpm --filter @apocalipticba/game-core test:watch     # modo watch
pnpm --filter @apocalipticba/game-core test:coverage  # con cobertura (v8)
```

Los tests usan el fixture `scenario.minimal.json` de `@apocalipticba/shared` y un layout sintético de nodos (`src/test-utils/fixtures.ts`). `createNullAdapters()` da input guionado, storage en memoria y adaptadores de audio y háptica que graban las llamadas.
