# ADR-006 — Contrato entre el host y `game-core`

- **Estado:** Aceptado
- **Fecha:** 2026-10-18

## Contexto

`packages/game-core` es la simulación: TypeScript puro que corre en Node y se prueba con Vitest, sin Three.js, React ni Expo. Pero varias cosas que la simulación necesita solo las sabe el host (`apps/mobile`): la geometría de colisión (BVH de `three-mesh-bvh`), qué tiene el jugador delante de la cámara, dónde quedó cada nodo del glTF de una zona y cuándo terminó de cargarse una zona. Además, todo tiene que ser determinista bajo test: misma entrada, mismos eventos.

## Decisión

El host y el core hablan solo por la API pública de `@apocalipticba/game-core` (`createGame` → `Game`), con este reparto:

- **Tiempo y azar entran desde afuera.** El host llama `step(dt)` desde un `createFixedStepLoop` alimentado con el delta de su rAF. El core no lee relojes ni usa `Math.random()`; el azar llega por un `Rng` con semilla.
- **El core no resuelve colisiones.** Cada paso produce `player.desiredDelta`; el host mueve la cápsula contra el BVH y devuelve el resultado con `player.commitMove({ position, grounded, hitCeiling })`. Mientras el host no haya llamado nunca a `commitMove` (tests), el core aplica el delta directo sobre un piso plano a la altura del spawn.
- **El host informa el candidato de interacción.** Hace el raycast (o la proximidad) contra los nodos `INT_` y llama `interaction.setCandidate(id)`. El core valida que exista, esté cargado, disponible y dentro de `interactRange`, y recién ahí emite `interact.prompt`.
- **La geometría de gameplay la aporta el host por zona.** `scenario.json` solo trae ids; al cargar una zona el host pasa sus nodos (`TRG_`, `COL_oneway_`, `CHK_`, `SPAWN_`, `PICK_`, `INT_`, `MRK_`) con posición y AABB o radio a `world.registerZoneNodes`. El core valida los ids contra el escenario (`collectSceneNodeIds` de `shared`) y lanza un error que nombra el nodo si no coinciden.
- **Trepar es guionado por el core.** Durante `phase: 'climbing'` el core mueve la posición por el `path`; el host ignora colisiones y no llama `commitMove`.
- **La salida es por eventos.** El HUD y el host se suscriben a un bus tipado (`events`); `state` es una vista de solo lectura para leer bajo demanda. El ECS (miniplex) es interno y no se exporta.

## Consecuencias

- Toda la lógica de nivel (triggers, objetivos, checkpoints, interactuables, oneways) se prueba en Node con un recorrido sintético Z1→Z5, sin GPU ni simulador.
- El reparto de colisiones agrega un paso de latencia: los triggers y pickups de un paso ven la posición que confirmó el `commitMove` anterior (16 ms a 60 Hz). Para volúmenes de metros es imperceptible.
- El host tiene responsabilidades explícitas que el Hito 9 debe respetar: llamar `commitMove` después de cada `step`, registrar y desregistrar zonas al responder a `zone.preload` / `zone.unload`, activar la colisión de un oneway al recibir `oneway.crossed` y releer `world.resolved` tras `checkpoint.restored` para ocultar pickups y abrir puertas.
- Si en Fase 1 la IA de zombies necesita raycasts o navmesh, hará falta un adaptador nuevo (por ejemplo `PhysicsAdapter.raycast`) en lugar de importar la geometría al core.

## Alternativas consideradas

- **Colisión dentro del core** (BVH o motor de física en TypeScript): duplica la geometría en memoria y los motores maduros son WASM, que Hermes no ejecuta.
- **Callback síncrono `resolveMove` inyectado:** elimina el paso de latencia pero acopla el `step` a la física del host y complica los tests; se puede agregar más adelante sin romper `commitMove`.
- **Que el core elija el candidato de interacción por proximidad:** no sabe hacia dónde mira la cámara ni si hay una pared en el medio; el raycast del host es la fuente correcta.
- **Posiciones de nodos en `scenario.json`:** duplicaría lo que ya está en Blender y se desincronizaría al editar el nivel.
