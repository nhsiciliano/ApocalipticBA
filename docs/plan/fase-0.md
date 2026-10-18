# Plan — ApocalipticBA, Fase 0 (fundaciones, spike de render, blockout)

## Contexto

El directorio `/Users/nhsiciliano/Desktop/ApocalipticBA` está vacío (solo el meta-skill `using-agent-skills`). El prompt base v1.0 define el producto completo (secciones 1–6) y pide ejecutar la **Fase 0** (sección 7): monorepo, `shared`, `game-core`, Supabase, landing, app mobile base, spike de render, blockout del Escenario 1 en Blender, recorrido caminable, lote de prueba Genex y CI.

Skill aplicado: `spec-driven-development` (la spec ya existe: es el prompt) → `planning-and-task-breakdown` (este plan) → `incremental-implementation` + `test-driven-development` por hito.

### Escala de dificultad usada en este plan

| Grado | Significado |
|---|---|
| **Bajo** | Configuración o código conocido, sin incógnitas técnicas. Riesgo de rework mínimo. |
| **Medio** | Lógica propia con tests, o integración de varias herramientas con documentación clara. Puede requerir 1–2 iteraciones. |
| **Alto** | Incógnitas técnicas reales (stack en evolución, Hermes sin WASM, hardware), dependencias externas (Xcode, Docker, Blender, cuentas) o trabajo que puede exigir cambiar el enfoque. |

### Resumen de dificultad por hito

| Hito | Tema | Dificultad |
|---|---|---|
| 0 | Bootstrap del repo | Bajo |
| 1 | Monorepo y tooling | Bajo |
| 2 | `packages/shared` | Bajo |
| 3 | `packages/game-core` | Medio |
| 4 | Supabase | Medio |
| 5 | Landing | Medio |
| 6 | App mobile base + GameCanvas dual | Alto |
| 7 | Spike de render | Alto |
| 8 | Blockout en Blender + export + validador | Alto |
| 9 | Recorrido caminable | Alto |
| 10 | Genex setup y lote de prueba | Medio |
| 11 | CI | Medio |
| — | Cierre y actualización del prompt | Bajo |

### Decisiones del usuario ya tomadas (18-oct-2026)

| Tema | Decisión |
|---|---|
| Dev builds | EAS Build en la nube (sin Xcode/Android Studio locales hoy) |
| Supabase | Local con Docker/OrbStack (el usuario lo instala) |
| Dispositivos spike | Solo iPhone 13/14 (iOS 18–26). Android queda pendiente y documentado |
| Firma iOS | Sin Apple Developer Program. Empezar en **iOS Simulator** |
| Git | `git init` + repo **público** en GitHub vía `gh` |
| Binarios | Blockout en git; `packages/assets/raw/` (Genex) en `.gitignore` + `manifest.json` de ids |

### Versiones verificadas (npm registry + docs oficiales, 18-oct-2026)

| Paquete | Versión fija | Nota |
|---|---|---|
| Node | 24.20.0 (instalado) | Expo 58 exige `^24.3`; Astro 7 exige `>=22.22` |
| pnpm | 12.14.0 | No hay corepack en Node 24 → `npm i -g pnpm@12.14.0` |
| turbo | 2.11.9 | |
| typescript | ~6.0.3 | Es lo que usa el template oficial de Expo 58. **No** TS 7 (tsgo) todavía |
| expo | ~58.0.14 | RN 0.88.0, React 19.3.0, `@types/react` ~19.3.0 |
| expo-router | ~58.0.23 | |
| react-native-reanimated / worklets | 4.7.1 / 0.13.0 | Peers de `react-native-webgpu` |
| react-native-gesture-handler | ~3.3.0 | Versión del template Expo 58 |
| **react-native-webgpu** | 0.16.1 | **`react-native-wgpu` está deprecado y renombrado**. New Arch obligatoria, Android minSdk 26 |
| three / @types/three | 0.186.1 / 0.186.0 | `three/webgpu`, `three/tsl` |
| @react-three/fiber | 9.8.2 | Requiere patch de `package.json` (`"react-native"` → bundle web) con `patch-package` |
| three-mesh-bvh | 0.9.16 | peer `three >= 0.159` |
| miniplex | 2.0.0 | |
| expo-gl | ~58.0.3 | Plan B |
| zod | 4.6.7 | |
| vitest | 5.0.5 | |
| astro | 7.4.0 | Vite 8, compilador Rust (más estricto), Tailwind 4 vía `@tailwindcss/vite` 4.3.3 (no `@astrojs/tailwind`) |
| @playwright/test | 1.64.1 | |
| supabase (CLI npm) | 2.121.0 | Como devDependency, sin Homebrew. Edge runtime embebido; Postgres sigue necesitando Docker |
| @supabase/supabase-js | 2.118.0 | |
| eas-cli | 25.2.0 | devDependency, se invoca con `pnpm exec eas` |
| eslint / typescript-eslint / prettier | 10.13.0 / 8.71.2 / 3.9.10 | ESLint flat config |
| @gltf-transform/cli | 4.5.1 | Optimización GLB |
| Blender | 5.2 LTS (jul-2026, soporte hasta jul-2028) | Solo Apple Silicon (ok, arm64). El usuario lo instala |
| Genex CLI | 1.36.9 (`npx @genex-ai/cli-demo@latest tools`) | 1 crédito = USD 0,01 |

### Desvíos respecto al prompt (se registran en ADRs)

1. **`react-native-wgpu` → `react-native-webgpu`** (ADR 002). API equivalente: `Canvas`, `getContext("webgpu")`, `context.present()`.
2. **GLB con texturas embebidas no carga en Hermes** (GLTFLoader no puede hacer `new Blob([ArrayBuffer])`, documentado en el ejemplo oficial de react-native-webgpu). El pipeline exporta **`.gltf` + `.bin` + texturas externas** hasta que el spike pruebe lo contrario. Afecta `level:export` y `assets:optimize`.
3. **KTX2 y meshopt requieren transcoders WASM** → no corren en Hermes. Para Fase 0: geometría con `KHR_mesh_quantization` (sin decoder) y texturas PNG/JPG ≤1024. La compresión nativa (ASTC/ETC2 con loader propio) o Draco asm.js es un ítem del spike, no un bloqueante.
4. **iOS Simulator requiere Xcode instalado** aunque el binario lo produzca EAS (`ios.simulator: true`). EAS no puede ejecutar el simulador por vos. Por eso el plan pide instalar Xcode desde la App Store; con Xcode instalado, un Apple ID gratuito permite además firmar builds de 7 días en el iPhone 13/14 (`expo run:ios --device`), lo que habilita mediciones reales del spike sin pagar el programa. Las métricas de simulador se marcan como **no válidas** en el informe.
5. **Repo público**: `docs/references/**` (fotos de terceros) va en `.gitignore` con un README que explica qué poner ahí. `packages/assets/raw/**` ignorado salvo `manifest.json`.
6. **Solo iPhone**: ADR 002 y `docs/spikes/render.md` dejan explícito que el backend Vulkan no se midió y que la decisión WebGPU vs plan B para Android queda abierta.

---

## Prerrequisitos que debe hacer el usuario (en paralelo al Hito 1)

- Instalar **Xcode** desde la App Store y abrirlo una vez (acepta licencia, instala iOS Simulator runtime).
- Instalar **Docker Desktop** u **OrbStack**.
- Instalar **Blender 5.2 LTS** en `/Applications` (blender.org/download/lts/5-2/).
- Crear/confirmar cuenta en **expo.dev** y correr `! pnpm exec eas login` cuando se lo pida el plan.
- Login de **Genex** en el navegador cuando corra el setup (Hito 10).
- Opcional: cuenta en supabase.com para staging (la landing en staging no bloquea la Fase 0).

Nada de esto bloquea los hitos 1–5.

---

## Hitos (orden de ejecución)

Cada hito termina con: tests verdes, `pnpm lint && pnpm typecheck` verdes, commit atómico. Los hitos 2–5 son independientes del toolchain nativo y se hacen primero. Cada tarea lleva su dificultad entre corchetes.

### Hito 0 — Bootstrap del repo — **Bajo**
- [Bajo] `npm i -g pnpm@12.14.0`; `git init`; `gh repo create nhsiciliano/ApocalipticBA --public --source=. --push` después del primer commit.
- [Bajo] `.gitignore` raíz: node_modules, `.expo`, `ios/ android/` (CNG), `.turbo`, `dist/` de build, `docs/references/**` (excepto `README.md`), `packages/assets/raw/**` (excepto `manifest.json` y `.gitkeep`), `supabase/.temp`, `.env*`.
- [Bajo] `.nvmrc` = 24.20.0; `packageManager: pnpm@12.14.0` en `package.json`.

### Hito 1 — Monorepo y tooling (7.1) — **Bajo**
Archivos: `package.json`, `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json`, `packages/config/{tsconfig.base.json,tsconfig.node.json,tsconfig.react-native.json,eslint.config.js,prettier.config.js}`, `README.md`, `AGENTS.md`, `docs/decisions/ADR-001..005.md`, `docs/references/escenario-01/README.md`.
- [Bajo] tsconfig base: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `moduleResolution: bundler`.
- [Bajo] Scripts raíz: `dev`, `build`, `lint`, `typecheck`, `test`, `level:export`, `level:validate`, `assets:optimize`, `db:types`, `db:start`, `db:reset`.
- [Bajo] Turbo pipeline con caché; `test` depende de `^build` solo donde haga falta.
- [Medio] ESLint 10 flat config compartida para Node, Astro y React Native (tres entornos, plugins distintos: `eslint-config-expo`, `eslint-plugin-astro`, `typescript-eslint`).
- [Bajo] `AGENTS.md` con las reglas de la sección 9 + sección reservada `## Genex` que el setup de Genex va a completar (no se sobrescribe después).
- [Bajo] ADRs: 001 monorepo pnpm+Turbo; 002 render WebGPU (`react-native-webgpu`) con plan B expo-gl, estado "pendiente de spike"; 003 Supabase; 004 Blender 5.2 LTS como editor de niveles; 005 cel-shading TSL (bandas, inverted hull, Sobel en alta). Formato MADR corto.
- [Bajo] Verificación: `pnpm install` limpio, `pnpm turbo run lint typecheck` sin paquetes aún (pasa vacío).

### Hito 2 — `packages/shared` (7.2) — **Bajo**
Archivos: `packages/shared/src/{index.ts, scenario/schema.ts, waitlist/schema.ts, edge/{start-session,submit-score,sync-progress}.ts, constants/{meteorite-palette.ts,quality.ts}, db/types.ts}`, tests en `src/**/*.test.ts`.
- [Medio] Esquema Zod de `scenario.json`: `{ id, slug, name, zones[], objectives[], triggers[], encounters[] (enc_*), notes[], checkpoints[] (CHK_*), interactables[] (INT_*), oneway[] (COL_oneway_*), pickups[] (PICK_*), spawns[] }` con ids tipados por prefijo (regex) para que el validador cruce contra el GLB. Es el contrato que usan game-core, Blender y el validador: hay que acertarle a la primera o se propaga.
- [Bajo] Waitlist: `{ email, locale: 'es-AR'|'en', source?, honeypot? }`.
- [Bajo] Payloads de Edge Functions + respuestas.
- [Bajo] Constantes: `METEORITE_PALETTE` (#FF3B1F, #FF6A3D, #C4160C, #4A0806, #8A3A2E@0.35, sangre #5C0F0F, pulso 1.5 s) y `QUALITY_LEVELS` (`low|medium|high` con flags: outlines, sobel, bloom, maxAnimatedZombies, renderScale).
- [Bajo] `db/types.ts`: generado por `pnpm db:types` (Hito 4); hasta entonces un placeholder tipado vacío con comentario.
- [Bajo] Tests Vitest: parse ok/ko de cada esquema; snapshot de un `scenario.json` mínimo.

### Hito 3 — `packages/game-core` (7.3) — **Medio**
Archivos: `src/{loop/fixed-step.ts, ecs/world.ts, adapters/{input,audio,storage,haptics}.ts, systems/{player-movement,objectives,triggers,checkpoints,interactables,notes}.ts, scenario/{load,runtime}.ts, index.ts}` + tests.
- [Medio] Loop: acumulador con `dt` fijo 1/60, `maxSubSteps`, `alpha` para interpolación de render; sin `requestAnimationFrame` (lo llama el host). Debe ser determinista bajo test.
- [Bajo] ECS: miniplex 2 (`World<Entity>`), componentes puros (`Transform`, `Velocity`, `PlayerIntent`, `Health`, `TriggerVolume`, `Interactable`, `Checkpoint`).
- [Bajo] Adaptadores: interfaces TS puras; `InputAdapter.sample(): PlayerIntent` (moveX/Y, lookDX/DY, jump, crouch, run, interact, interactHeld).
- [Medio] `player-movement`: intención → velocidad deseada (caminar/correr/agachado, salto como impulso vertical, gravedad). La resolución de colisión la hace el host (mobile) y devuelve la posición final. El contrato host↔core tiene que quedar claro para que el Hito 9 no lo rompa.
- [Medio] `triggers`: volúmenes AABB/OBB, eventos `enter/exit/stay`, un solo disparo opcional.
- [Bajo] `objectives`: lista secuencial, `advance(id)`, estado observable.
- [Medio] `checkpoints`: snapshot `{position, health, ammo, inventory, objectives}` serializable (lo persiste `StorageAdapter`).
- [Medio] `interactables`: notas, puertas bloqueadas, `hold` con progreso acumulable que no se reinicia al soltar (puerta "Forzar" ~6 s), `climb` como secuencia guionada (posiciones + duración).
- [Bajo] Event bus tipado para que el HUD se suscriba selectivamente.
- [Medio] Tests: timestep determinista, movimiento, triggers enter/exit, objetivos secuenciales, checkpoint round-trip, hold acumulable, carga de `scenario.json` con los esquemas de `shared`.

### Hito 4 — Supabase (7.4) — **Medio**
Archivos: `supabase/{config.toml, migrations/0001_schema.sql, 0002_rls.sql, 0003_functions.sql, seed.sql, functions/{_shared/,waitlist-signup,start-session,submit-score,sync-progress}/index.ts, functions/deno.json}` + tests.
- [Bajo] `pnpm exec supabase init`; `supabase start` (requiere Docker instalado por el usuario).
- [Medio] Migraciones: las 11 tablas de la sección 5, índice `scores(scenario_id, score desc)`, función `top_scores(scenario_id, limit)`, RLS en todas (`scores`/`game_sessions` sin insert desde cliente; `waitlist` sin select público; `profiles`/`player_progress` por `auth.uid()`), rate-limit table para waitlist. La RLS es fácil de escribir mal en silencio: se prueba con tests negativos.
- [Bajo] Seeds: escenario `constitucion`, armas `pistola` y `escopeta`, remote config inicial (`min_app_version`, flags).
- [Alto] Edge Functions en Deno reutilizando Zod de `shared`: handlers puros en `handler.ts` (testeables con Vitest en Node) + `index.ts` con `Deno.serve`. Import map en `deno.json` apuntando a `../../packages/shared/src/`. Incógnita: si el bundler de `functions deploy` no acepta imports fuera de `functions/`, fallback a script que copia `shared` a `functions/_shared/`.
- [Medio] `waitlist-signup`: validación, honeypot, rate limit por IP/email, insert con service role, respuesta sin filtrar datos.
- [Bajo] Stubs con validación Zod + tests de contrato: `start-session`, `submit-score`, `sync-progress`.
- [Bajo] `pnpm db:types` → `packages/shared/src/db/types.ts`.
- [Medio] Verificación: `supabase db reset` limpio; test de integración que inserta en waitlist vía función y comprueba con anon key que `select` devuelve 0 filas (criterio 7.12).

### Hito 5 — Landing (7.5) — **Medio**
Archivos: `apps/landing/{astro.config.mjs, src/{layouts,pages/{index,en/index,privacidad,terminos,prensa}.astro, components/*, i18n/{es-AR,en}.json, islands/Waitlist.ts, styles/global.css}, public/, tests/e2e/*.spec.ts, lighthouserc.json}`.
- [Bajo] Astro 7.4 `output: 'static'`, `i18n: { defaultLocale: 'es-AR', locales: ['es-AR','en'], routing: { prefixDefaultLocale: false } }`, Tailwind 4 por `@tailwindcss/vite`, `@astrojs/sitemap`.
- [Medio] Secciones 1.8 con textos reales de la premisa (voseo) y arte provisorio (SVG/placeholder con la paleta del meteorito). Hero, escenarios, features, galería, FAQ, CTAs (App Store / Google Play deshabilitados + waitlist), press kit, privacidad, términos. El volumen de contenido en dos idiomas es lo que lo hace medio, no la técnica.
- [Medio] Waitlist: isla sin framework (`<script>` TS) que hace `fetch` a `PUBLIC_SUPABASE_URL/functions/v1/waitlist-signup` con el anon key; honeypot; estados ok/error; CORS en la Edge Function.
- [Bajo] SEO: meta, OG, JSON-LD `VideoGame`, smart banner meta tags, sitemap.
- [Medio] Playwright: render de ambas locales, envío de waitlist contra Supabase local.
- [Medio] Lighthouse ≥95 en las cuatro categorías: `@lhci/cli` contra `astro preview` (local y CI). Accesibilidad y performance suelen necesitar 1–2 pasadas de ajuste.

### Hito 6 — App mobile base (7.6) — **Alto**
Archivos: `apps/mobile/{app.json, eas.json, metro.config.js, babel.config.js, patches/@react-three+fiber+9.8.2.patch, app/{_layout,index,menu,scenarios,play,pause,game-over,summary,journal,ranking,profile,settings,login}.tsx, src/{render/{GameCanvas.tsx,webgpu/FiberCanvas.tsx,webgpu/makeWebGPURenderer.ts,webgl/GLCanvas.tsx,backend.ts}, debug/DebugOverlay.tsx, store/*, adapters/*}}`.
- [Medio] Expo 58 + expo-router + expo-dev-client en monorepo pnpm (instalación aislada; fallback `nodeLinker: hoisted` si Metro no resuelve). `app.json`: `newArchEnabled: true`, `orientation: landscape`, plugins `react-native-webgpu`, `expo-screen-orientation`, `expo-dev-client`; bundle id `ar.com.apocalipticba.app`.
- [Bajo] Navegación entre pantallas placeholder con Expo Router.
- [Medio] Metro: alias `three`→`three.webgpu.js` (según docs oficiales), `assetExts` + `glb gltf bin hdr`; polyfill `fast-text-encoding` como primer import; `patch-package` para `@react-three/fiber`.
- [Alto] `GameCanvas` dual: `webgpu/FiberCanvas` (createRoot de R3F + `present()` en `onCreated`, según la doc oficial) y `webgl/GLCanvas` (expo-gl + `WebGLRenderer` + R3F nativo), seleccionado por `settings.renderBackend` (Zustand, persistido). Alto porque el paquete está en evolución, R3F necesita patch, y las dos rutas de R3F (bundle web vs nativo) conviven en el mismo bundle Metro.
- [Medio] Overlay de debug: fps, frame time, draw calls (`renderer.info`), triángulos, backend, calidad.
- [Alto] `eas.json` con perfiles `development-simulator` (`ios.simulator: true`), `development` (device), `preview`; `eas build:configure` tras `eas login`; primer build en la nube. Alto por dependencias externas: cuenta Expo, cupo del plan free, Xcode instalado para correr el `.app` resultante, y los errores de build nativo solo se ven en el log remoto.
- [Medio] Verificación: instalar el `.app` en el Simulator; navegación placeholder y cubo girando en ambos backends.

### Hito 7 — Spike de render (7.7) — **Alto**
Archivos: `apps/mobile/src/spike/{SpikeScene.tsx, materials/{toon.tsl.ts, outline-hull.ts, sobel-pass.ts}, glow/Billboards.tsx, fog.ts}`, `docs/spikes/render.md`, ADR 002 actualizado.
- [Medio] Escena: plano con textura de rombos (placeholder procedural hasta Genex), niebla de color plano, glow por billboards aditivos.
- [Alto] 30 zombies skinned animados (placeholder riggeado `Soldier`/`Michelle` de three como `.gltf` separado, o el zombie Genex). Incógnitas: carga de `.gltf` externo en Hermes, memoria con 30 skinned, skinning en WebGPURenderer vs WebGLRenderer.
- [Alto] Material toon en TSL (gradient map 3 bandas + rim + emisivo con pulso 1.5 s) que compile a WGSL **y** a GLSL para el plan B; inverted hull; pase Sobel a media resolución solo en `high` (post-processing con TSL en RN tiene menos ejemplos).
- [Alto] Medición en iPhone 13/14 real: fps promedio y p1, frame time, carga, temperatura/throttling a 10 min, batería. Depende de firmar con Xcode + Apple ID gratuito. En Simulator solo validación funcional, marcada como no válida.
- [Alto] Checklist de incógnitas del pipeline: `.gltf` externo vs `.glb`, `KHR_mesh_quantization`, Draco asm.js, texturas comprimidas nativas, leak de renderer al remontar (issue #445).
- [Medio] Entregable: `docs/spikes/render.md` con tablas, decisión iOS (WebGPU/plan B/híbrido) y "Android: pendiente". ADR 002 actualizado.

### Hito 8 — Blockout del Escenario 1 en Blender (7.8) — **Alto**
Archivos: `levels/escenario-01/scripts/{build_level.py, zones/{z1_hall,z2_plaza,z3_frente,z4_lateral,z5_interior,bg_skyline}.py, markers.py, export.py}`, `levels/escenario-01/README.md`, `scenarios/escenario-01/scenario.json`, `tools/level-export/`, `tools/level-validate/`.
- [Medio] Infraestructura `bpy` headless (Blender 5.2, 1 u = 1 m): helpers para crear primitivas, colecciones `Z1_Hall … BG_Skyline`, nombres por convención y custom properties → glTF extras.
- [Alto] Geometría de las 5 zonas + fondo según 1.3 (hall con kioscos/boletería/andenes, fachada, plaza con palos borrachos, frente con reja, lateral con 5–7 contrafuertes/calle cortada/andamio/patio, interior con nave y sacristía). Alto porque el diseño espacial se hace a ciegas desde código y requiere iterar con capturas o con el playtest del Hito 9 (distancias, alturas de andamio, ángulos ciegos entre contrafuertes).
- [Medio] Marcadores completos: `COL_`, `COL_oneway_`, `TRG_`, `SPAWN_`, `PICK_`, `INT_`, `CHK_`, `NAV_` (navmesh = malla plana caminable por zona).
- [Medio] `scenario.json`: objetivos, encuentros `enc_4a`, `enc_4b_1..3`, `enc_4d` y los de la plaza, notas con ambas cartas, checkpoints, interactables (reja, `INT_climb_andamio`, puerta sacristía hold 6 s), oneway.
- [Medio] `pnpm level:export`: invoca Blender headless, exporta `.gltf` + `.bin` por zona + `skyline` a `packages/assets/raw/levels/` y corre `assets:optimize` (gltf-transform: `dedup`, `prune`, `quantize`, LODs simples; copia a `packages/assets/dist/levels/`).
- [Medio] `pnpm level:validate` (Node, `@gltf-transform/core`): todo id de `scenario.json` existe en los GLB, cada zona tiene `COL_` y `NAV_`, presupuestos (≤300k tris, ≤150 draw calls estimados). Falla con lista clara.
- [Bajo] Si Blender no está instalado al llegar acá, el validador y `scenario.json` se desarrollan contra un fixture mínimo y la exportación queda como paso bloqueado documentado.

### Hito 9 — Recorrido caminable en la app (7.9) — **Alto**
Archivos: `apps/mobile/src/{level/{ZoneStreamer.ts, loadZone.ts}, player/{CapsuleController.ts, bvh.ts}, input/{TouchControls.tsx, joystick.ts}, ui/hud/{Hud.tsx, NoteViewer.tsx, InteractPrompt.tsx}, game/{GameHost.ts (loop + adapters)}}`.
- [Medio] `GameHost`: conecta loop de `game-core`, adapters de input/storage/haptics y el render; lee el input en el loop, no vía estado React.
- [Medio] Streaming por zonas: carga Z(n±1), descarga zonas anteriores al cruzar `COL_oneway_`; carga de `.gltf` por `Image.resolveAssetSource`.
- [Alto] Controlador de cápsula con `three-mesh-bvh` sobre mallas `COL_` (shapecast), gravedad, salto, agacharse, escalones, sin atravesar paredes a 60 Hz; raycast para interacción. Es la pieza con más tuning y más casos borde.
- [Medio] Controles táctiles con gesture-handler: joystick izquierdo, arrastre derecho para mirar, botones salto/agacharse/interactuar; multitouch sin conflictos con el HUD.
- [Medio] HUD con suscripciones selectivas (vida, munición, objetivo, crosshair, prompt de interacción); visor de notas con ambas cartas.
- [Medio] Interactuables del recorrido: reja bloqueada con mensaje, puerta "Forzar" acumulable (sin oleada).
- [Alto] Andamio one-way guionado (`INT_climb`): movimiento con cámara controlada que aterriza bien en el patio y dispara la descarga de zonas 2–3.
- [Alto] Verificación: recorrido completo Z1 → carta final sin bloqueos en Simulator (y en iPhone si hay firma local). Alto porque cualquier hueco de colisión o trigger mal ubicado en el Hito 8 aparece recién acá y obliga a volver a Blender.

### Hito 10 — Genex: setup y lote de prueba (7.10) — **Medio**
- [Bajo] `npx @genex-ai/cli-demo@latest tools` en la raíz; el usuario hace login; `npx genex doctor`.
- [Bajo] Integrar lo que Genex agregue a `AGENTS.md` sin pisar las reglas propias.
- [Bajo] Proponer el lote (zombie común riggeado + walk/run/attack/die, viewmodel pistola, palo borracho, textura rombos `--terrain`, fragmento de meteorito) con costo estimado de `npx genex --help` y **esperar confirmación**.
- [Medio] Generar con `--no-wait --out-dir packages/assets/raw/<tipo>/`, `npx genex wait --all`, registrar ids en `packages/assets/raw/manifest.json`. Medio por la dependencia del servicio (colas, fallos con refund, "Not approved yet").
- [Alto] Integrar el zombie riggeado de Genex en la escena del spike: rig/animaciones de Genex vs `AnimationMixer` de three, máscara emisiva para ojos/venas con el material toon, posible re-exportación a `.gltf` separado. Es donde se ve si el estilo de Genex funciona con el cel-shading.
- [Bajo] Documentar ajustes de prompt en `docs/spikes/genex-style.md`.

### Hito 11 — CI (7.11) — **Medio**
Archivos: `.github/workflows/ci.yml`.
- [Bajo] Jobs `install` (pnpm cache), `lint`, `typecheck`, `test` con caché de Turborepo.
- [Medio] `build:landing` + Lighthouse CI en el runner (umbral 95 puede fluctuar en CI; se fija con `numberOfRuns`).
- [Bajo] `level:validate` contra los `.gltf` commiteados en `dist/levels`.
- [Medio] Job `supabase`: `supabase start` en el runner (Docker disponible en ubuntu-latest) + tests de Edge Functions.
- [Bajo] EAS Build en tags como job manual (`workflow_dispatch`) hasta que haya cuenta de Apple.

### Cierre (7.13) — **Bajo**
- [Bajo] Resumen de hecho/pendiente, lista de decisiones para el usuario.
- [Bajo] Actualización de la sección 8 del prompt en `docs/prompt-base.md` (copia versionada del prompt con las decisiones tomadas).

---

## Verificación end-to-end (criterios 7.12)

1. `pnpm install && pnpm dev` levanta landing (`astro dev`) y Metro de la app sin errores; la app se abre en el development build del Simulator.
2. Playwright envía la waitlist → fila en Supabase local; test con anon key confirma que la RLS devuelve 0 filas.
3. `docs/spikes/render.md` existe con mediciones (iPhone real si hay firma, Simulator marcado como no válido) y decisión para iOS; Android explícitamente pendiente.
4. Recorrido Z1 → carta 2 completo en el dispositivo disponible, grabado como video/GIF de evidencia.
5. `pnpm level:validate` verde en CI.
6. Lote Genex integrado o pendiente solo de confirmación de costo.

## Decisiones que requieren al usuario (se irán pidiendo en el hito correspondiente)

- Confirmar costo del lote Genex antes de generar.
- Instalar Xcode, Docker/OrbStack y Blender 5.2 (sin esto, hitos 6–9 y 4 quedan bloqueados en la parte de ejecución).
- Si quiere medir en iPhone real sin Apple Developer Program: aceptar firma local con Apple ID gratuito (builds de 7 días).
- Nombre del bundle id / package (propuesto `ar.com.apocalipticba.app`).
- Proyecto Supabase staging (opcional en Fase 0).

## Fuera de alcance de la Fase 0

Combate, zombies en el nivel, auth, rankings, guardado en nube, remote config, Sentry, Vercel deploy de la landing, Android (medición), Escenario 2.
