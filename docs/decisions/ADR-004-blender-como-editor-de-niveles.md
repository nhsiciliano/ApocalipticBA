# ADR-004 — Blender como editor de niveles

- **Estado:** Aceptado
- **Fecha:** 2026-10-18

## Contexto

Los niveles necesitan geometría, colisiones, triggers, spawns, pickups, interactuables y checkpoints en un mismo lugar visual. No conviene construir un editor propio. Blender es gratuito, scriptable y exporta glTF.

## Decisión

**Blender 5.2 LTS** (5.2.2, soporte hasta julio 2028, Apple Silicon) es el editor de niveles. La versión se fija en el README y en CI.

- **Blockout por script:** el greybox se genera con scripts `bpy` en Blender headless, a escala 1 unidad = 1 m. Después viene el playtest en la app, el pase de arte con piezas modulares y la iluminación horneada.
- **Archivo por escenario:** `levels/escenario-01/escenario-01.blend`, con una colección por zona (`Z1_Hall`, `Z2_Plaza`, `Z3_Frente`, `Z4_Lateral`, `Z5_Interior`, `BG_Skyline`).
- **Convenciones de nombres** que el validador entiende: `COL_` (colisión, va al BVH y no se renderiza), `COL_oneway_<id>`, `TRG_<id>`, `SPAWN_<encuentro>_<n>`, `PICK_<tipo>`, `INT_<tipo>_<id>`, `CHK_<n>` y `NAV_`. Los datos extra viajan como custom properties, exportadas como glTF extras.
- **Exportación:** `pnpm level:export` genera un `.gltf` por zona más el skyline, con `.bin` y texturas externos (Hermes no carga GLB con texturas embebidas; ver ADR-002), y luego corre `assets:optimize`.
- **Validador** (`pnpm level:validate`): todo id de `scenario.json` existe en el glTF, cada zona tiene colisión y navmesh, y se cumplen los presupuestos de triángulos y draw calls.

## Consecuencias

- El nivel es un archivo `.blend` binario; los cambios del usuario sobre él nunca se sobrescriben desde scripts sin avisar.
- Los scripts `bpy` dependen de la API de Blender 5.2, que puede cambiar entre versiones mayores.
- El contrato entre el `.blend` y el juego es la convención de nombres más `scenario.json`; un error de nombre lo detecta el validador, no el runtime.

## Alternativas consideradas

- **Editor de niveles propio:** meses de trabajo para algo que Blender ya hace.
- **Unity o Godot como editor:** obligan a mantener un segundo motor solo para autoría.
- **Construcción a mano en código (TypeScript):** poco iterable para un nivel con arte, iluminación y colisiones.
