# ADR-003 — Supabase como backend

- **Estado:** Aceptado
- **Fecha:** 2026-10-18

## Contexto

El producto necesita cuentas (con sesión anónima para invitados), progreso sincronizado, un ranking confiable, una lista de espera para la landing y configuración remota. El ranking solo tiene sentido si los puntajes no se pueden falsear desde el cliente. El equipo es una sola persona, así que conviene un backend gestionado, con entorno local reproducible.

## Decisión

**Supabase**, con estos lineamientos:

- **Auth:** email, Google y Sign in with Apple; sesión anónima vinculable a una cuenta.
- **Postgres con RLS en todas las tablas.** `profiles` y `player_progress` se acceden por `auth.uid()`; `waitlist` no tiene lectura pública.
- **Edge Functions como único camino de escritura a `scores` y `game_sessions`:** `start-session` emite un token firmado, `submit-score` lo valida junto con la plausibilidad del resultado, el rate limit y los duplicados. `waitlist-signup` y `sync-progress` completan el conjunto. Las funciones reutilizan los esquemas Zod de `packages/shared`.
- **Entorno local:** Supabase CLI 2.121 como devDependency, con Postgres en Docker (OrbStack). Entornos `local`, `staging` y `production`.
- **Tipos** generados con `supabase gen types` hacia `packages/shared`.
- Las políticas de RLS se prueban con **tests negativos**: es fácil escribirlas mal en silencio.

## Consecuencias

- Se evita operar un servidor propio y se obtiene Auth, base de datos y funciones en una sola plataforma.
- La integridad del ranking depende de que ningún cliente tenga permiso de insertar en `scores`; eso se verifica con tests.
- Hay dependencia de un proveedor; el SQL de las migraciones es portable, las Edge Functions menos.
- Desarrollar en local requiere Docker corriendo.

## Alternativas consideradas

- **Firebase:** modelo NoSQL y reglas de seguridad menos expresivas para un ranking con validación; el ecosistema SQL encaja mejor.
- **Backend propio (Node + Postgres):** control total, pero hay que operar, parchear y escalar la infraestructura.
- **Sin backend en Fase 0:** retrasa la validación del contrato de scores y de la lista de espera, que son parte del alcance.
