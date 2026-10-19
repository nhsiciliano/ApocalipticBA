# @apocalipticba/supabase

Backend local de ApocalipticBA: migraciones de Postgres con RLS, seeds, Edge Functions en Deno y los tests que verifican que la RLS hace lo que dice. Las decisiones están en [ADR-003](../docs/decisions/ADR-003-supabase-backend.md) (Supabase) y [ADR-007](../docs/decisions/ADR-007-edge-functions-y-shared.md) (cómo las funciones reutilizan `@apocalipticba/shared`).

## Requisitos

- **Docker** corriendo (en esta máquina, OrbStack: `orb start`). Postgres, Auth, PostgREST, el gateway (Kong) y el edge runtime corren en contenedores.
- El CLI de Supabase **no se instala aparte**: es la devDependency `supabase` (2.121.0) y se invoca con `pnpm exec supabase` o con los scripts de abajo. El binario viene como paquete opcional por plataforma (`@supabase/cli-darwin-arm64`), sin postinstall.

## Comandos

Desde la raíz del repo:

| Comando         | Qué hace                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------- |
| `pnpm db:start` | Levanta el stack local (la primera vez descarga las imágenes, ~2 GB)                      |
| `pnpm db:reset` | Recrea la base: aplica `migrations/` y después `seed.sql`                                 |
| `pnpm db:types` | Regenera `packages/shared/src/db/types.ts` desde la base local (requiere el stack arriba) |

Desde el paquete (`pnpm --filter @apocalipticba/supabase <script>`):

| Script             | Qué hace                                                                               |
| ------------------ | -------------------------------------------------------------------------------------- |
| `start` / `stop`   | `supabase start` / `supabase stop`                                                     |
| `status`           | URLs y claves locales                                                                  |
| `reset`            | `supabase db reset`                                                                    |
| `types`            | `scripts/gen-types.mjs`: `supabase gen types`, encabezado y Prettier                   |
| `functions:serve`  | Sirve las Edge Functions con hot reload, leyendo `supabase/.env`                       |
| `lint`             | ESLint: funciones con las reglas comunes sin globals de Node; tests y scripts con Node |
| `typecheck`        | `tsc` para tests y scripts (Node) y `tsc -p functions` para las funciones (ver abajo)  |
| `test`             | Tests unitarios de los handlers (siempre corren; también desde `pnpm test` en la raíz) |
| `test:integration` | Tests contra el stack local (ver abajo)                                                |

Los scripts usan `--workdir ..`: el CLI busca `supabase/config.toml` dentro del directorio que se le pasa, y el cwd de los scripts es `supabase/`.

## Puertos y URLs locales

Salida de `supabase status` (sin claves; las claves se leen siempre de ahí, nunca se copian al repo):

| Servicio        | URL                                                       |
| --------------- | --------------------------------------------------------- |
| API (gateway)   | `http://127.0.0.1:54321`                                  |
| REST            | `http://127.0.0.1:54321/rest/v1`                          |
| GraphQL         | `http://127.0.0.1:54321/graphql/v1`                       |
| Edge Functions  | `http://127.0.0.1:54321/functions/v1/<función>`           |
| Postgres        | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio          | `http://127.0.0.1:54323`                                  |
| Mailpit (email) | `http://127.0.0.1:54324`                                  |

Claves: `PUBLISHABLE_KEY` (rol anon, la que usan la landing y la app) y `SECRET_KEY` (service role, solo para Edge Functions y tests). También están las legacy `ANON_KEY` / `SERVICE_ROLE_KEY` en formato JWT.

## Estructura

```text
supabase/
├── config.toml            # proyecto "apocalipticba", auth (email + anónimos), funciones
├── migrations/
│   ├── *_schema.sql       # 11 tablas + waitlist_rate_limits, índices, trigger handle_new_user
│   ├── *_rls.sql          # RLS en todas las tablas, grants mínimos, revokes explícitos
│   └── *_functions.sql    # top_scores, player_display_name, touch_updated_at, bump_rate_limit
├── seed.sql               # escenarios, armas y remote config inicial
├── functions/
│   ├── deno.json          # import map compartido (resuelve @apocalipticba/shared → packages/shared)
│   ├── tsconfig.json      # solo para tsc/ESLint: APIs web, sin tipos de Node
│   ├── _shared/           # cors, json, rate-limit, env, stub y el shim de tipos de Deno
│   ├── waitlist-signup/   # index.ts (Deno.serve) + handler.ts (puro) + store.ts (supabase-js)
│   ├── start-session/     # stub
│   ├── submit-score/      # stub
│   └── sync-progress/     # stub
├── scripts/gen-types.mjs
└── tests/
    ├── unit/              # handlers con store falso y reloj inyectado
    └── integration/       # contra el stack local
```

Cada función separa `index.ts` (solo wiring de entorno y `Deno.serve`) de `handler.ts`, una función pura `(req, deps) => Promise<Response>` que se prueba en Node 24 con los `Request`/`Response` globales.

## Edge Functions

| Función           | Estado   | `verify_jwt` | Qué hace                                                                                   |
| ----------------- | -------- | ------------ | ------------------------------------------------------------------------------------------ |
| `waitlist-signup` | Completa | `false`      | Alta en la lista de espera de la landing (pública, con la publishable key)                 |
| `start-session`   | Stub     | `true`       | Valida con `StartSessionRequestSchema`; 501 `{ error: 'not_implemented', hito: 'Fase 2' }` |
| `submit-score`    | Stub     | `true`       | Valida con `SubmitScoreRequestSchema`; 501                                                 |
| `sync-progress`   | Stub     | `true`       | Valida con `SyncProgressRequestSchema`; 501                                                |

Los stubs responden 400 `{ error: 'invalid_request', issues }` con los issues de Zod (`path`, `code`, `message`) si el body no valida, y 400 `{ error: 'invalid_json' }` si no es JSON.

`waitlist-signup`, en orden:

1. CORS: `OPTIONS` → 204; un `Origin` que no está en `ALLOWED_ORIGINS` → 403; otro método → 405. Las solicitudes sin `Origin` (no navegador) pasan.
2. Rate limit por IP: 5 cada 10 minutos (primera entrada de `x-forwarded-for`). Cuenta también las solicitudes inválidas.
3. Validación con `WaitlistSignupSchema` → 400 `invalid_email`.
4. Honeypot (`isHoneypotTripped`) → 200 `{ ok: true }` sin insertar.
5. Rate limit por email: 3 por día → 429 `rate_limited`.
6. Insert con service role. Un email repetido también responde 200 `{ ok: true }` (idempotente: no permite enumerar emails).
7. Cualquier error interno → 500 `internal`, sin detalles (se loguean en el runtime).

Los contadores viven en `waitlist_rate_limits` con claves `sha-256(sal:tipo:valor)`: ni la IP ni el email quedan en claro. La función SQL `bump_rate_limit` incrementa en un solo upsert (atómico) con ventana fija y recibe `now` desde la función.

### Variables de entorno

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta el runtime. Las propias están en [`.env.example`](.env.example):

| Variable          | Funciones       | Default                 |
| ----------------- | --------------- | ----------------------- |
| `ALLOWED_ORIGINS` | todas           | `http://localhost:4321` |
| `RATE_LIMIT_SALT` | waitlist-signup | — (obligatoria)         |

Para desarrollo: `cp supabase/.env.example supabase/.env` y `pnpm --filter @apocalipticba/supabase functions:serve` (pasa `--env-file .env`). `supabase start` también sirve las funciones pero lee `supabase/functions/.env`: sin ese archivo, `waitlist-signup` no arranca (falta `RATE_LIMIT_SALT`) y los stubs sí. En staging y producción van como secrets (`supabase secrets set`).

En local, el gateway (Kong) responde él mismo los preflight `OPTIONS` con `Access-Control-Allow-Origin: *`; la política de orígenes del handler se prueba en los tests unitarios.

### Chequeo de tipos de las funciones

No hace falta instalar Deno. `functions/tsconfig.json` chequea las funciones con `lib: ["es2023", "dom"]` y sin tipos de Node, así que usar una API de Node falla en `typecheck`. El global `Deno` (solo `Deno.serve` y `Deno.env.get`, usados en los `index.ts`) está declarado en `functions/_shared/deno.d.ts`. La resolución real de Deno (import map, extensiones `.ts`, `npm:` specifiers) la prueban los tests de integración, que llaman a las funciones corriendo en el edge runtime (Deno 2.1).

## Tests

```bash
pnpm --filter @apocalipticba/supabase test               # unit (Node, sin Docker)

pnpm db:start && pnpm db:reset                           # stack limpio
pnpm --filter @apocalipticba/supabase test:integration   # integración
```

Los de integración leen URLs y claves de `supabase status -o env`; si el stack no responde, se saltean (`describe.skipIf`). El `globalSetup` levanta `supabase functions serve` con un `.env` temporal (sal aleatoria por corrida, así los contadores de rate limit de otra corrida no interfieren) y lo baja al terminar. Verifican:

- `waitlist-signup`: alta real (comprobada con service role), duplicado sin segunda fila, y la sexta solicitud desde la misma IP → 429.
- Con la clave anon: `select` sobre `waitlist` → `42501 permission denied for table waitlist` (criterio 7.12); `insert` en `scores` y `game_sessions` falla; el catálogo se lee; `top_scores` vacío; `bump_rate_limit` no es invocable.
- Jugadores anónimos (`signInAnonymously`): el trigger crea el perfil; cada uno lee y escribe solo su `player_progress`; otro jugador no puede leer, insertar ni actualizar el ajeno; el ranking público muestra puntajes validados con `display_name`.
- Los stubs validan detrás del gateway (501 / 400).

Al terminar, `functions serve` se lleva el contenedor del edge runtime: para volver a servir las funciones con `supabase start`, `pnpm --filter @apocalipticba/supabase stop` y `pnpm db:start`, o usá `functions:serve`.

## Tipos

`pnpm db:types` (con el stack arriba) regenera `packages/shared/src/db/types.ts` y lo formatea. El archivo trae `/* eslint-disable */` porque es código generado. Después de cambiar una migración: `pnpm db:reset && pnpm db:types` y commitear ambos.

## Pendiente (Fase 2)

- `start-session`, `submit-score` (único camino de escritura a `scores`) y `sync-progress`.
- Proveedores de Auth Google y Sign in with Apple (`[auth.external.*]` en `config.toml`).
- Inserción de telemetría vía función.
- Evaluar pasar las funciones de usuario a `verify_jwt = false` + verificación en código con `@supabase/server`, que es lo que hoy recomienda Supabase.
