# ADR-007 — Edge Functions que importan `@apocalipticba/shared` por import map

- **Estado:** Aceptado
- **Fecha:** 2026-10-19

## Contexto

Las Edge Functions de Supabase corren en Deno y tienen que validar con los mismos esquemas Zod que usan la landing y la app (`packages/shared`), sin duplicarlos. Hay dos obstáculos. Deno exige extensión en los imports relativos, y `shared` importaba sin extensión (`'./schema'`). Además, `shared` vive fuera de `supabase/functions/`, y no estaba claro si `functions serve` y `functions deploy` aceptan módulos fuera de esa carpeta. Como plan B se había previsto un script que copiara `shared` dentro de `functions/_shared/`.

## Decisión

**Import map directo, sin copia.**

- `packages/shared` y `packages/game-core` usan extensión `.ts` explícita en todos los imports relativos, con `allowImportingTsExtensions` en `packages/config/tsconfig.base.json` (los dos paquetes son `noEmit`). Vite, Vitest y Metro resuelven esas rutas sin cambios.
- `supabase/functions/deno.json` mapea `@apocalipticba/shared` a `../../packages/shared/src/index.ts`, `zod` a `npm:zod@4.6.7` y `@supabase/supabase-js` a `npm:@supabase/supabase-js@2.118.0`. Cada función lo declara con `import_map = "./functions/deno.json"` en `config.toml`. El CLI solo descubre `deno.json` junto al entrypoint de cada función, así que sin esa clave no se usaría el de la raíz de `functions/`.
- En Node, las mismas importaciones resuelven por el workspace de pnpm, y así los handlers se prueban con Vitest.

Verificado en local con CLI 2.121.0 y edge runtime 1.77.4 (Deno 2.1.4): `supabase start` y `supabase functions serve` resuelven el import map hacia fuera de `functions/`, y los tests de integración ejercitan las funciones validando con los esquemas de `shared`. Según la documentación del CLI (Context7), `functions deploy` sube los imports que quedan fuera del workdir siempre que estén dentro de la raíz del repo git, con nombres relativos `../`. Es el caso de `packages/shared`.

## Consecuencias

- Hay una sola fuente de verdad para los contratos: un cambio en un esquema de `shared` impacta a la vez en las funciones, la app y la landing.
- No hay carpetas generadas ni pasos `pre*` que se puedan desincronizar.
- Los imports relativos con `.ts` son obligatorios en `shared` y `game-core`. Un import sin extensión compila en Node pero rompe en Deno; los tests de integración lo detectan.
- Todo lo que `shared` importa tiene que existir en el import map de Deno (hoy solo `zod`). Si `shared` suma una dependencia, hay que agregarla a `deno.json`.
- El primer deploy real (Fase 2) tiene que confirmar el bundling remoto. Si falla, el fallback sigue disponible: copiar `packages/shared/src` a `functions/_shared/shared/` (gitignored) antes de `functions deploy`.

## Alternativas consideradas

- **Copiar `shared` a `functions/_shared/`** con un script (`sync-shared.mjs`): funciona siempre, pero duplica código, agrega un paso fácil de olvidar y hace que lo que se testea en Node no sea exactamente lo que corre en Deno. Queda como fallback.
- **Publicar `shared` como paquete npm o JSR:** el repo es público pero el paquete es interno; versionarlo y publicarlo en cada cambio es demasiada ceremonia para un monorepo.
- **Bundlear `shared` a un `.js` con esbuild:** agrega un build step y una dependencia más solo para resolver extensiones.
