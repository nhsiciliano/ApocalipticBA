# ApocalipticBA — Prompt base v1.0 (inicio de Fase 0)

> Copia versionada del prompt base entregado por el usuario el 2026-10-18. La sección 8 se actualiza con las decisiones tomadas durante la Fase 0. Las decisiones ya registradas están al final, en "8-bis".

## 0. Rol, contexto y forma de trabajo

Actuá como un equipo senior de desarrollo de videojuegos (game dev, mobile, backend, technical art y DevOps).
Vas a construir **ApocalipticBA**, un shooter en primera persona (FPS) de zombies para **iOS y Android**, ambientado en la Ciudad Autónoma de Buenos Aires, Argentina.
El juego se presenta y se ofrece mediante una **landing web**. No hay versión jugable en la web.

**Premisa:** un meteorito cae sobre la ciudad. El material que libera transforma a la población en zombies. El protagonista despierta solo, tras un golpe en la cabeza, y sigue el rastro de su padre a través de escenarios reconocibles de CABA.

**Tarea actual:** ejecutar la **Fase 0** (sección 7). Las secciones 1 a 6 son el contexto completo del producto y las decisiones ya tomadas. Respetalas aunque la Fase 0 no las implemente todas.

**Reglas generales:**

- Antes de instalar cualquier dependencia, verificá en la documentación oficial actualizada cuál es la versión estable vigente y su compatibilidad con Expo y React Native. Fijá versiones exactas.
- Los puntos marcados `[A DEFINIR]` no bloquean la Fase 0. Usá el valor por defecto indicado en la sección 8 y dejalo registrado.
- Cada decisión técnica relevante se documenta como ADR en `docs/decisions/`.

---

## 1. Funcionalidad

### 1.1 Tono visual

**Cel-shading estilo cómic**, inspirado en la estética de Borderlands (referencia de estilo, no de contenido):

- Contornos de tinta negros y gruesos en siluetas y bordes de objetos.
- Sombreado en 2–3 bandas duras, sin degradados suaves.
- Texturas pintadas a mano con trazos de tinta y hatching integrados en la textura.
- Formas exageradas y robustas: armas grandes, props con proporciones caricaturescas.
- Cielo y niebla de color plano para dar profundidad.

Identidad porteña: fileteado, adoquines, lajas, faroles, palos borrachos, cartelería ferroviaria genérica, persianas metálicas, colectivos y taxis negros y amarillos.

**Restricción:** no usar assets, logos, personajes, tipografías ni elementos distintivos de Borderlands ni de otras marcas.

**Paleta del meteorito:** rojo intenso con núcleo anaranjado incandescente. Es el único color saturado y emisivo del juego, y siempre se lee como "contaminación".

| Uso                                  | Color               |
| ------------------------------------ | ------------------- |
| Núcleo emisivo                       | #FF3B1F             |
| Glow / halo                          | #FF6A3D             |
| Medio (vetas, grietas)               | #C4160C             |
| Oscuro (zonas quemadas)              | #4A0806             |
| Tinte de cielo y niebla post-impacto | ~#8A3A2E al 30–40 % |

**Aplicaciones del rojo meteorito:**

- Fragmentos con grietas incandescentes.
- Ojos y venas brillantes en los zombies, más intensos en los Corredores.
- Cielo y niebla teñidos en exteriores.
- En interiores, el rojo entra solo como luz por ventanas y vitrales.

**Separación del lenguaje de daño:**

- Daño recibido: viñeta oscura, desaturación y flechas direccionales blancas. Nunca un flash rojo plano.
- Sangre: rojo oscuro y mate (#5C0F0F), nunca emisivo.

**Accesibilidad del color:** el meteorito se distingue también por luminancia y por un pulso de brillo lento (~1,5 s). Validar con simulación de deuteranopía y protanopía.

### 1.2 Núcleo jugable (FPS)

- **Cámara y movimiento:** primera persona, caminar, correr, saltar, agacharse, head-bob opcional.
- **Armas del Escenario 1:**
  - Pistola y escopeta.
  - Disparo hitscan, recarga, munición, retroceso, dispersión y cambio de arma.
  - El rifle queda para escenarios posteriores.
- **Zombies:**
  - **Común:** lento y resistente al cuerpo, débil a la cabeza.
  - **Corredor:** rápido y frágil, con ojos y venas más brillantes y gruñido de aviso propio.
  - **Mutado:** muy resistente. Aparece en escenarios posteriores.
  - IA por máquina de estados: idle → wander → chase → attack → dead.
  - Navegación por navmesh.
  - Daño localizado: la cabeza recibe daño crítico.
- **Supervivencia:** sistema de vida, daño, muerte y reaparición en el último checkpoint.
- **Pickups:** botiquín, munición, armas y linterna.

### 1.3 Escenario 1 — "Constitución"

**Ubicación:** zona de Estación Constitución, Plaza Constitución y una iglesia neogótica cercana.

**Licencia geográfica:** estación, plaza e iglesia se compactan en un recorrido continuo y legible. No hace falta respetar distancias ni orientación reales. Los edificios son reinterpretaciones estilizadas, no réplicas exactas.

**Referencias:**

- Imágenes en `docs/references/escenario-01/`: `01-estacion-exterior`, `02-estacion-hall`, `03-plaza`, `04-iglesia`. Las coloca el usuario.
- Son de uso interno exclusivamente: no se publican ni se usan como input de generación de assets.

**Duración objetivo:** 20–30 minutos.

#### Apertura

- El protagonista despierta en el piso del hall de la estación.
- Intro jugable, sin cinemática no interactiva:
  - Visión borrosa y viñeta por el golpe en la cabeza, que se aclaran en ~10 s.
  - Sonido amortiguado.
- Cerca encuentra la primera carta de su padre. Se lee en pantalla completa, con voz en off:

> Te golpeaste fuerte la cabeza y te desmayaste. Decidimos dejarte para que te recuperes mientras vamos a la iglesia, cruzando toda la plaza, a buscar provisiones. Nos llegó el mensaje de que ahí vamos a encontrar alimentos, agua y algunas armas más. Desde que cayó el meteorito todo es una locura: la gente parece poseída y no se puede confiar en nadie. Vamos a volver lo antes posible a buscarte. Te quiero. Papá.

#### Zonas

| #   | Zona                            | Objetivo                                   | Enemigos                                       | Introduce                                                                             |
| --- | ------------------------------- | ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Hall de la estación             | Leer la carta, juntar armas e ítems, salir | Ninguno (susto guionado opcional, sin combate) | Moverse, mirar, interactuar, recoger, cambiar de arma, recargar, leer notas, linterna |
| 2   | Plaza                           | Cruzar hasta la iglesia                    | Comunes en grupos crecientes                   | Combate, headshots, munición, coberturas                                              |
| 3   | Frente de la iglesia            | Entrar → reja cerrada                      | Pocos comunes                                  | Bloqueo y cambio de objetivo                                                          |
| 4   | Lateral izquierdo de la iglesia | Llegar a la puerta trasera                 | Corredores y comunes                           | Enemigo rápido, emboscadas, trepar, interacción sostenida                             |
| 5   | Interior de la iglesia          | Encontrar la segunda carta                 | Pocos o ninguno                                | Exploración y cierre narrativo                                                        |

#### Zona 1 — Hall de la estación

- **Espacio:** gran bóveda de cañón con arcos casetonados y medallones, ventanal en arco (luneta) al fondo, galería superior perimetral y relojes de pared.
- **Piso:** damero de rombos terracota y gris oscuro con guardas. Es la textura firma de la zona.
- **Centro del hall:**
  - Fila de kioscos y puestos de revistas: loot y cobertura.
  - Boletería de planta curva con vidrios.
- **Armas e ítems:**
  - Pistola en un bolso junto al protagonista.
  - Escopeta en la boletería.
  - Munición y botiquines en los kioscos.
  - Linterna, necesaria para los andenes oscuros.
- **Salida:** la salida a la plaza, por el gran arco central, se habilita cuando el jugador recogió ambas armas.
- **Paleta:**
  - Piedra crema y ocre.
  - Luz cálida y polvorienta por la luneta, con haces estilizados (planos con gradiente).
  - Andenes en penumbra fría.

#### Transición — Fachada de la estación

- Al salir y girar, plano de revelación de la fachada:
  - Piedra salmón y cúpula central con reloj.
  - Mansardas de pizarra con buhardillas y chimeneas.
- Frente a la estación:
  - Refugios de colectivo con techo amarillo (genéricos, sin marcas).
  - Sendas peatonales.
  - Colectivos y taxis abandonados, y semáforos caídos.

#### Zona 2 — Plaza

- **Suelo:** grandes lajas grises en los caminos y canteros de pasto verde saturado.
- **Vegetación:** palos borrachos (tronco abultado, copa ancha, flores rosas) como elemento visual dominante y cobertura.
- **Mobiliario:** columnas de alumbrado altas, bancos bajos de hormigón, tachos y kiosco de diarios.
- **Bordes:** edificios de renta de estilo francés y torres de los años 70 como silueta de fondo, y paradas de colectivo con vehículos abandonados.
- **Meteorito:** fragmentos incrustados en la laja, con grietas incandescentes.
- **Encuentros:** 3–4, escalonados de la estación hacia la iglesia, con checkpoint entre cada uno.
- **Exploración:** pickups en los bordes como premio.

#### Zona 3 — Frente de la iglesia

- **Iglesia neogótica:**
  - Dos torres con agujas negras de alturas distintas y rosetón central.
  - Tres portales ojivales con gabletes y pináculos.
- **Reja:** reja de hierro negro forjado que encierra el atrio, con portón cerrado con cadenas. Al interactuar: "Está cerrada. Tiene que haber otra entrada."
- **Calle:** farolas antiguas naranjas y esquina con senda peatonal.
- **Contexto:**
  - A la derecha, un edificio anexo de varios pisos. No es jugable.
  - Al fondo, la autopista elevada como landmark del horizonte.
- **Indicadores hacia el lateral izquierdo:** luz, rastros y un zombie que llega desde ahí.
- **Paleta:** piedra gris fría, agujas y reja negras.

#### Zona 4 — Lateral izquierdo de la iglesia

- **Ruta:** vereda y calle a lo largo de la nave, hasta el patio trasero junto al ábside.
- **Duración:** 6–8 minutos.
- **Límites:**
  - De un lado, el muro de la nave.
  - Del otro, la calle cortada por autos chocados, un colectivo atravesado, vallas de obra y escombros.
  - Al fondo, casas con persianas cerradas.
- **Ambiente:**
  - Lado en sombra con paleta fría.
  - Agujas y pináculos recortados contra el cielo rojo.
  - Zócalo del muro pintado y con grafitis genéricos.
  - Faroles intermitentes.

**Beats:**

- **4a — Esquina:**
  - `CHK_4a` al doblar la esquina.
  - Vista larga y recta. Un Corredor aparece al fondo y carga de frente, sin coberturas en el medio.
  - Luego aparecen 2 comunes.
- **4b — Contrafuertes:**
  - 5–7 contrafuertes rítmicos; los huecos entre ellos son ángulos ciegos.
  - 2–3 emboscadas de Corredores por trigger. Al menos una se anticipa con un gruñido o una sombra.
  - Comunes que llegan desde la calle.
  - Munición y un botiquín escondidos en algunos huecos.
- **4c — Andamio:**
  - Valla de obra y contenedor de escombros bloquean el paso.
  - El jugador trepa 1–2 niveles por un andamio de restauración apoyado en la nave y salta al patio trasero por encima de una tapia.
  - Es un camino de un solo sentido. Se descargan las zonas 2–3.
  - `CHK_4c` al aterrizar.
- **4d — Patio trasero:**
  - Canteros, una imagen de piedra genérica, bancos y cajones como cobertura.
  - La puerta de la sacristía está trabada: se mantiene "Forzar" durante ~6 s, con progreso acumulable que no se reinicia al soltar.
  - Al empezar a forzar, entra una oleada mixta por portones laterales.
  - Al abrirse, la puerta se cierra detrás del jugador.

**Encuentros:**

- `enc_4a`: 1 Corredor guionado + 2 comunes.
- `enc_4b_1` a `enc_4b_3`: 1 Corredor + 1–2 comunes cada uno.
- `enc_4d`: 6–8 comunes + 3–4 Corredores, en 2 tandas.

#### Zona 5 — Interior de la iglesia

- **Espacio:**
  - Nave central con bóvedas de crucería, columnas y bancos volcados.
  - Luz del rosetón y de los vitrales con tinte rojo sobre el piso: momento visual clave.
- **Rastros del padre:**
  - Huellas, cajas de agua abiertas y estantes vacíos en la sacristía.
  - Una puerta lateral trasera atrancada desde afuera.
- **Segunda carta:** sobre el altar, con voz en off:

> Hijo: las cosas se complicaron todavía más. Una horda de zombies rodeó la iglesia y tuvimos que escaparnos por atrás, hacia la boca del subte. Era el camino más seguro. Logramos juntar algo de agua y algunas armas. Nos enteramos de que en la estación Retiro hay un grupo numeroso de civiles armados y vamos a intentar unirnos a ellos. Vamos a tratar de llegar por el subte. En cuanto pueda juntar un grupo armado y fuerte, voy a ir a buscarte. Intentá mantenerte a salvo. Papá.

**Beat final:**

1. El objetivo cambia a "Llegar a la boca del subte".
2. Por un vitral roto se ve a lo lejos la boca del subte bajo el cielo rojo, con siluetas de la horda y gruñidos en aumento.
3. Fundido a negro y resumen del escenario: tiempo, bajas, precisión, headshots y notas encontradas.
4. Guardado y desbloqueo del Escenario 2.

### 1.4 Escenario 2 — "Línea C" (solo gancho; fuera del alcance actual)

- Seguir el rastro del padre por el subte, de Constitución hacia Retiro.
- Comienza en la boca del subte cercana a la plaza.
- Estaciones, señalética y trenes estilizados y genéricos, sin logos, isotipos ni tipografías oficiales.

### 1.5 Sistemas de nivel y narrativa

Implementados en `game-core` y data-driven, a partir de un `scenario.json` por escenario:

- **Objetivos:** lista secuencial con texto en el HUD y marcador opcional.
- **Triggers:** volúmenes que disparan eventos (encuentro, objetivo, checkpoint, sonido, texto).
- **Interactuables:**
  - Notas, puertas, rejas bloqueadas, pickups y contenedores.
  - Trepar (`INT_climb_<id>`): movimiento guionado corto con cámara controlada.
  - Interacción sostenida: progreso acumulable, con eventos de inicio y fin.
- **Bloqueos de un solo sentido** (`COL_oneway_<id>`), con descarga de las zonas anteriores.
- **Notas:** visor a pantalla completa, voz en off opcional y diario consultable.
- **Spawner por encuentro:**
  - Composición por tipo y cantidad.
  - Aparición fuera de la vista del jugador.
  - Condición de fin del encuentro.
- **Checkpoints:** guardan posición, vida, munición, inventario y estado de objetivos.
- **Resumen de fin de escenario** y desbloqueo del siguiente.

### 1.6 Metajuego

- Progreso por escenario y desbloqueos.
- Ranking por escenario: puntaje, tiempo y precisión.
- Guardado en la nube para usuarios logueados y guardado local para invitados.
- Juego offline completo; la sincronización ocurre al reconectar.

### 1.7 Controles (mobile)

- **Táctil:**
  - Joystick virtual izquierdo para moverse y zona derecha de arrastre para apuntar.
  - Botones de disparo, recarga, salto, cambio de arma, linterna e interacción contextual.
  - Posición y tamaño de los controles configurables.
- **Opcionales:** giroscopio para apuntar y gamepad Bluetooth.
- **Feedback:** respuesta háptica en disparo, impacto y daño recibido.
- **Pantalla:** landscape fija.
- **Ajustes:** sensibilidad, invertir eje Y y FOV.

### 1.8 Landing

- **Contenido:**
  - Hero con key art y trailer cuando exista, y premisa del meteorito.
  - Escenarios, features, galería y FAQ.
- **CTAs:** links a App Store y Google Play, más una waitlist mientras el juego no esté publicado.
- **Institucional:** press kit, política de privacidad y términos.
- **Idiomas:** es-AR (principal) y en.

---

## 2. Arquitectura

### 2.1 Monorepo

pnpm workspaces + Turborepo, TypeScript strict en todo el código.

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

### 2.2 Principios

- **`game-core`:**
  - TypeScript puro y testeable en Node: simulación, IA, armas, daño, encuentros, objetivos, puntaje y balance.
  - No importa Three.js, React ni APIs de Expo.
- **`apps/mobile`:** traduce el estado de `game-core` a render, audio, háptica e input mediante adaptadores (`InputAdapter`, `AudioAdapter`, `StorageAdapter`, `HapticsAdapter`).
- **Loop:** timestep fijo para la simulación, renderizado desacoplado.
- **Entidades:** ECS liviano (por ejemplo miniplex).
- **Pooling:** object pooling para zombies, decals, partículas e impactos.

### 2.3 Render 3D

- **Stack:**
  - Three.js con `WebGPURenderer` (`three/webgpu`) + React Three Fiber, sobre `react-native-wgpu` (WebGPU vía Dawn → Metal en iOS, Vulkan en Android).
  - Requiere development build (`expo prebuild` / EAS). No funciona en Expo Go.
- **Puente:** componente `GameCanvas` (FiberCanvas) que crea el root de R3F sobre el canvas de `react-native-wgpu` y llama a `present()` en cada frame.
- **Aislamiento:** todo lo específico del renderer vive en `apps/mobile/src/render/`, detrás de `GameCanvas`. Motivo: el paquete está en evolución y su empaquetado puede cambiar.
- **Plan B:** `expo-gl` + `WebGLRenderer` detrás del mismo `GameCanvas`, para dispositivos sin WebGPU/Vulkan o si el spike lo indica.
- **Shaders y materiales:** todo lo custom se escribe en **TSL**, que compila a WGSL y a GLSL.
- **Física y colisiones:**
  - Hermes no ejecuta WebAssembly, así que no se usan motores WASM.
  - Jugador: controlador de cápsula con `three-mesh-bvh` contra la geometría `COL_`.
  - Disparos y línea de visión: raycasts sobre el BVH.
  - Zombies: cápsulas y separación por grilla espacial.
- **Viewmodel:** capa propia con FOV fijo.

### 2.4 Cel-shading en mobile

- **Material toon en TSL:**
  - Gradient map de 2–3 bandas y rim light leve.
  - Emisivo con pulso para los elementos del meteorito.
- **Contornos según calidad gráfica:**
  - Baja y media: inverted hull en personajes, viewmodel y props clave. En la arquitectura, las líneas de tinta van pintadas en la textura.
  - Alta: además, un pase de detección de bordes por profundidad y normales (Sobel), a resolución reducida.
- **Glow:**
  - Baja y media: billboards aditivos, sin bloom.
  - Alta: bloom selectivo sobre emisivos.
- **Sombras e iluminación:**
  - Sin shadow maps dinámicos.
  - Blob shadow bajo los personajes.
  - Iluminación horneada estilizada (vertex colors o lightmaps).
- **Niebla:** de color plano por zona, que además limita la distancia de dibujado.

### 2.5 Pipeline de assets con Genex (https://genex.games/SKILL.md)

- **Setup:**
  - Se hace en la **raíz del monorepo**: `npx @genex-ai/cli-demo@latest tools`.
  - Requiere Node ≥ 20.
  - El inicio de sesión lo hace el usuario en el navegador; el agente solo espera. Si aparece "Not approved yet", correr `npx genex auth`.
- **Antes y después de generar:** `npx genex doctor` antes de generar y después de cualquier error.
- **Salidas:** todas van a `packages/assets/raw/<tipo>/` con `--out-dir`.
- **Generación en paralelo:** usar `--no-wait` y consultar con `npx genex wait --all`. Nunca relanzar un comando para ver su estado.
- **Costos y reutilización:**
  - Informar el costo estimado antes de cada tanda y esperar la confirmación del usuario.
  - Nunca regenerar un asset que ya existe.
  - Integrar todo lo generado.
- **Archivos del usuario:** el setup de Genex agrega reglas a `AGENTS.md`. No sobrescribirlas; integrarlas con las reglas del proyecto.
- **Sufijo de estilo para todos los prompts:** "cel-shaded comic style, thick black ink outlines, hand-painted textures with ink hatching, stylized chunky proportions".
- **Optimización (`pnpm assets:optimize`, de `raw/` a `dist/`):**
  - Modelos GLB con meshopt o Draco, más LODs.
  - Texturas en KTX2.
  - Audio en AAC/Opus.
- **Consumo:** la app usa solo `dist/`.

**Lista de assets del Escenario 1** (se genera por tandas en la Fase 1, salvo el lote de prueba de la Fase 0):

- **Personajes riggeados:**
  - Zombie común: vecino porteño con ropa de calle.
  - Zombie corredor: delgado y encorvado.
  - Ambos con máscara emisiva para ojos y venas.
  - Animaciones: idle, caminar, correr, atacar, recibir golpe y 2 muertes.
- **Viewmodels:** manos con guantes, pistola y escopeta. Animaciones de disparo, recarga y cambio de arma.
- **Estación, interior:**
  - Módulos de bóveda casetonada, pilastra con medallón, luneta y baranda de la galería.
  - Reloj de pared, banco de madera, boletería curva, kiosco de revistas y cartelería genérica.
- **Estación, exterior:**
  - Módulos de fachada salmón: arco de entrada, ventanas, cúpula con reloj, mansarda con buhardilla y chimenea.
  - Refugio de colectivo con techo amarillo.
- **Plaza:**
  - Palo borracho (2–3 variantes) y árbol genérico.
  - Columna de alumbrado, banco de hormigón, tacho y kiosco de diarios.
  - Fragmento de meteorito.
  - Colectivo y taxi genéricos, sin marcas.
- **Iglesia, módulos neogóticos:**
  - Portal ojival con gablete, rosetón, agujas de 2 alturas, contrafuerte con pináculo, muro con ventana ojival y ábside.
- **Iglesia, elementos:**
  - Reja de hierro forjado y portón con cadenas.
  - Farola naranja, puerta de sacristía reforzada, puerta lateral atrancada y vitral roto.
- **Iglesia, interior:** columna, bóveda de crucería, banco, altar, velas, cajas de provisiones y cajas de agua vacías.
- **Zona 4:** andamio modular, valla de obra, contenedor de escombros, tapia, portón lateral de hierro, autos chocados, cantero, imagen de piedra genérica y cajones.
- **Fondo:** siluetas de edificios de renta y torres, autopista elevada y boca del subte genérica.
- **Texturas tileables:**
  - Rombos terracota/gris, piedra crema, piedra salmón y pizarra.
  - Laja gris, pasto, asfalto, piedra gris de la iglesia y hierro forjado.
  - Vitrales (2–3 variantes) y zócalo pintado con grafitis genéricos.
- **Ítems:** carta 1 (papel doblado), carta 2 (arrugada y manchada), botiquín, caja de munición y linterna.
- **Efectos de sonido:**
  - Ambientes: estación vacía con eco, plaza post-impacto e interior de iglesia con reverb.
  - Zombies: gruñidos de común y de Corredor, y aviso de Corredor.
  - Pasos en piedra, pasto, metal y madera.
  - Armas: disparos y recargas.
  - Meteorito: pulso y zumbido.
  - Zona 4: forzar la puerta y su apertura.
  - Final: crescendo de la horda.
- **Música:** exploración y combate.
- **Voz:** lectura de ambas cartas, con la voz del padre en acento rioplatense.
- **Efectos visuales:** glow rojo, brasas y ceniza, viñeta de daño, fogonazo e impactos.
- **Arquitectura grande:** siempre en piezas modulares.

### 2.6 Construcción de niveles con Blender

**Flujo de trabajo:**

1. **Blockout (greybox):** generado por el agente con scripts `bpy` en Blender headless, a escala 1 unidad = 1 m.
2. **Playtest del blockout en la app.**
3. **Pase de arte:** reemplazar el greybox por piezas modulares, manteniendo colisiones y marcadores.
4. **Iluminación horneada estilizada.**

**Estructura del archivo:** `levels/escenario-01/escenario-01.blend`, con una colección por zona:
`Z1_Hall`, `Z2_Plaza`, `Z3_Frente`, `Z4_Lateral`, `Z5_Interior`, `BG_Skyline`.

**Convenciones de nombres:**

- `COL_` → colisión: va al BVH y no se renderiza.
- `COL_oneway_<id>` → bloqueo de un solo sentido.
- `TRG_<id>` → trigger.
- `SPAWN_<encuentro>_<n>` → punto de aparición.
- `PICK_<tipo>` → pickup.
- `INT_<tipo>_<id>` → interactuable.
- `CHK_<n>` → checkpoint.
- `NAV_` → navmesh.
- Datos extra en custom properties, que se exportan como glTF extras.

**Exportación:** `pnpm level:export` genera un GLB por zona más `skyline.glb` en `packages/assets/raw/levels/`, y luego corre `assets:optimize`.

**Versión de Blender:** LTS, fijada en el README y en CI.

**Validador:** comprueba que todo id de `scenario.json` exista en los GLB, que cada zona tenga colisión y navmesh, y que se cumplan los presupuestos de triángulos y draw calls.

---

## 3. Frontend

### 3.1 Landing (`apps/landing`)

- Astro (versión estable vigente) con salida estática.
- Islas solo donde haga falta: formulario de waitlist y reproductor del trailer.
- Tailwind CSS e i18n nativo de Astro (es-AR / en).
- **SEO:** meta tags, Open Graph, sitemap y JSON-LD (VideoGame / MobileApplication).
- Smart banners de App Store y Google Play.
- La waitlist envía los datos a la Edge Function `waitlist-signup`. La landing no tiene servidor propio.
- Lighthouse ≥ 95 en todas las categorías.

### 3.2 App mobile (`apps/mobile`)

- Expo (SDK estable vigente) con Expo Router y development builds vía EAS.
- **Pantallas:** splash, menú principal, selección de escenario, partida, pausa, game over, resumen, diario, ranking, perfil, configuración y login.
- **HUD:**
  - En React Native, superpuesto al canvas: vida, munición, objetivo actual, crosshair e indicador de interacción.
  - Se actualiza con suscripciones selectivas, nunca re-renderizando por frame.
- **Input:** `react-native-gesture-handler` con multitouch. El input se lee en el loop del juego, no vía estado de React.
- **Módulos Expo:** `expo-sensors`, `expo-haptics`, `expo-audio`, `expo-screen-orientation`, `expo-keep-awake`.
- **Calidad gráfica:** baja, media y alta, con detección inicial según el dispositivo y resolución dinámica.
- **Distribución:** EAS Build, Submit y Update (OTA solo para JS y contenido).

### 3.3 Estado y datos

- Estado de partida en `game-core`, fuera de React.
- Zustand para menús, configuración y el puente hacia el HUD.
- TanStack Query para los datos del servidor.
- Guardado local con `expo-sqlite` o MMKV, con cola de sincronización.
- Esquemas Zod en `packages/shared`.

---

## 4. Backend (Supabase)

- **Auth:**
  - Email, Google y Sign in with Apple (guía 4.8 de App Store).
  - Sesión anónima para invitados, vinculable a una cuenta después.
- **Base de datos:** Postgres con RLS en todas las tablas.
- **Edge Functions (TypeScript, reutilizan los esquemas Zod de `packages/shared`):**
  - `waitlist-signup`: validación, honeypot y rate limit.
  - `start-session`: crea la sesión de partida y devuelve un token firmado.
  - `submit-score`:
    - Valida el token, la plausibilidad del resultado, el rate limit y si es un duplicado.
    - Es el único camino para escribir en `scores`.
  - `sync-progress`: merge del progreso local con el de la nube, resolviendo conflictos.
- **Remote config:** balance, encuentros, feature flags y versión mínima de la app.
- **Telemetría:** anónima y con opt-out.
- **Entornos:** `local` (Supabase CLI), `staging` y `production`.
- **Tipos:** generados con `supabase gen types` dentro de `packages/shared`.

---

## 5. Base de datos

| Tabla            | Campos clave                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| auth.users       | gestionada por Supabase Auth                                                                                |
| profiles         | user_id, display_name, country, settings (jsonb), created_at                                                |
| scenarios        | id, slug, name, order, is_active                                                                            |
| weapons          | id, slug, name, base_stats (jsonb)                                                                          |
| player_progress  | user_id, scenario_id, best_time_ms, completed, notes_found (jsonb), updated_at                              |
| player_unlocks   | user_id, item_type, item_id, unlocked_at                                                                    |
| game_sessions    | id, user_id, scenario_id, app_version, platform, started_at, ended_at, token_hash                           |
| scores           | id, session_id, user_id, scenario_id, score, duration_ms, kills, accuracy, headshots, validated, created_at |
| remote_config    | key, value (jsonb), platform, min_app_version                                                               |
| waitlist         | email, locale, source, created_at                                                                           |
| telemetry_events | id, session_id, type, payload (jsonb), created_at                                                           |

- Índice en `scores (scenario_id, score DESC)` y función para el top N por escenario.
- **RLS:**
  - `scores` y `game_sessions` sin inserción directa del cliente; solo vía Edge Functions.
  - `waitlist` sin lectura pública.
- **Seeds:** escenario `constitucion`, armas `pistola` y `escopeta`, y remote config inicial.

---

## 6. Requisitos

### 6.1 Rendimiento (mobile, por zona)

- ≤ 150 draw calls y ≤ 300k triángulos visibles.
- Texturas ≤ 1024 px.
- Instancing y LOD.
- Skinning por GPU, con límite de zombies animados simultáneos.
- **Objetivo de frame rate:** 60 fps en gama media-alta y 30 fps estables en gama media-baja.
- **Descarga inicial:** < 150 MB.

### 6.2 Calidad

- TypeScript strict; ESLint y Prettier compartidos.
- **Tests:**
  - Vitest para `game-core` y Edge Functions.
  - Playwright para la landing.
  - Maestro para los flujos de la app.
- **CI (GitHub Actions):** lint, typecheck, tests, builds afectados y validador de niveles. EAS Build en tags.

### 6.3 Accesibilidad y localización

- Subtítulos para todas las voces.
- Crosshair configurable y daltónico-friendly.
- Sensibilidad, FOV y reducción de movimiento.
- Controles táctiles reubicables.
- Idiomas: es-AR (voseo, por defecto) y en.

### 6.4 Legal y stores

- **Marcas:**
  - Sin logos ni marcas registradas reales: transporte, subte, empresas o clubes.
  - Los lugares públicos se reinterpretan de forma estilizada.
  - Las fotos de referencia de terceros no se publican.
- **Contenido:** clasificación por violencia (IARC / App Store).
- **Datos personales:**
  - Ley 25.326 (Argentina); GDPR si hay usuarios de la UE.
  - Privacy labels y Data Safety.
  - Borrado de cuenta desde la app.
- **Compras digitales**, si existen: StoreKit / Google Play Billing (por ejemplo vía RevenueCat).

### 6.5 Fases

- **Fase 0:** fundaciones, spike de render y blockout (sección 7).
- **Fase 1:** Escenario 1 completo y jugable en mobile, con arte, audio y cel-shading.
  - Criterios: jugable de principio a fin, 30 fps en el dispositivo de gama media-baja del spike y checkpoints que no pierden progreso.
- **Fase 2:** auth, rankings, guardado en la nube y remote config.
- **Fase 3:** Escenario 2 y contenido adicional.
- **Fase 4:** pulido, accesibilidad, localización y publicación en las stores.

---

## 7. TAREA ACTUAL — Fase 0

Objetivo: dejar las fundaciones listas, validar el stack de render en dispositivos reales y tener el recorrido completo del Escenario 1 caminable en blockout.

### 7.1 Monorepo y tooling

- pnpm workspaces + Turborepo con la estructura de 2.1.
- `packages/config`: tsconfig base (strict), ESLint y Prettier.
- Scripts raíz: `dev`, `build`, `lint`, `typecheck`, `test`, `level:export`, `level:validate`, `assets:optimize`.
- `README.md` con requisitos (Node, pnpm, Blender LTS, Supabase CLI, EAS CLI) y comandos.
- `AGENTS.md` con las reglas del proyecto (sección 9), integradas con las que agregue Genex.
- ADRs iniciales en `docs/decisions/`:
  - 001 monorepo
  - 002 render WebGPU con plan B
  - 003 Supabase
  - 004 Blender como editor de niveles
  - 005 cel-shading

### 7.2 `packages/shared`

- Esquemas Zod de `scenario.json`, de la waitlist y de los payloads de las Edge Functions.
- Tipos de la base generados.
- Constantes: paleta del meteorito y niveles de calidad.

### 7.3 `packages/game-core` (esqueleto funcional)

- Loop con timestep fijo y ECS.
- Interfaces de los adaptadores (2.2).
- Sistemas mínimos:
  - Movimiento del jugador: entrada abstracta → velocidad. La colisión la resuelve el adaptador de mobile.
  - Objetivos, triggers y checkpoints leídos desde `scenario.json`.
- Tests con Vitest de esos sistemas.

### 7.4 Supabase

- `supabase init` y entorno local.
- Migraciones con todas las tablas de la sección 5, RLS e índices.
- Seeds.
- Edge Function `waitlist-signup` implementada y testeada.
- `start-session`, `submit-score` y `sync-progress` como stubs con validación Zod y tests de contrato.

### 7.5 Landing

- Astro con i18n y las secciones de 1.8 con contenido placeholder: textos reales de la premisa y arte provisorio.
- Formulario de waitlist conectado a Supabase local y de staging.
- Lighthouse ≥ 95.

### 7.6 App mobile (base)

- Expo con Expo Router, development build configurado (EAS) y landscape fija.
- Navegación entre pantallas placeholder.
- `GameCanvas` con dos implementaciones intercambiables por configuración:
  - `react-native-wgpu` + `WebGPURenderer`.
  - `expo-gl` + `WebGLRenderer`.
- Overlay de debug: fps, frame time, draw calls, triángulos y backend activo.

### 7.7 Spike técnico de render (decisión de 2.3)

**Escena de prueba:**

- Plano con la textura de rombos.
- 30 zombies animados con skinning, usando el zombie del lote de prueba de Genex (7.9) o un placeholder riggeado hasta que esté.
- Material toon TSL, inverted hull y, en calidad alta, el pase Sobel.
- Glow por billboards y niebla de color.

**Medición** en las dos implementaciones, en los dispositivos de 8.1:

- fps promedio y p1.
- Frame time.
- Temperatura y throttling tras 10 minutos.
- Consumo de batería aproximado.
- Tiempo de carga.

**Entregable:** `docs/spikes/render.md` con resultados, decisión (WebGPU, plan B o híbrido por dispositivo) y ADR 002 actualizado.

### 7.8 Blockout del Escenario 1 en Blender

- Scripts `bpy` en `levels/escenario-01/scripts/` que generan el greybox de las 5 zonas y el fondo, siguiendo 1.3:
  - Hall con kioscos, boletería y andenes.
  - Fachada.
  - Plaza con coberturas y palos borrachos como volúmenes.
  - Frente con la reja.
  - Lateral con contrafuertes, calle cortada, andamio y patio.
  - Interior con nave y sacristía.
- Todos los marcadores con las convenciones de 2.6: colisiones, triggers, spawns, pickups, interactuables, checkpoints, navmesh y one-way.
- `scenarios/escenario-01/scenario.json` con objetivos, encuentros (`enc_*`), notas y checkpoints, referenciando los ids del GLB.
- `pnpm level:export` y `pnpm level:validate` funcionando localmente y en CI.

### 7.9 Recorrido caminable en la app

- Cargar los GLB del blockout con streaming por zonas.
- Controlador de cápsula con `three-mesh-bvh`, controles táctiles (moverse, mirar, saltar, agacharse, interactuar) y trepar.
- Triggers, objetivos y checkpoints activos.
- Visor de notas con el texto de ambas cartas.
- Reja bloqueada, andamio de un solo sentido y puerta con "Forzar" (todavía sin oleada).
- Sin combate ni zombies en el nivel. Los zombies solo aparecen en la escena del spike.
- Debe poder recorrerse de la Zona 1 a la carta final sin bloqueos.

### 7.10 Genex — setup y lote de prueba de estilo

1. Setup y `npx genex doctor` (ver 2.5).
2. Proponer al usuario un lote de prueba con su costo estimado y esperar su confirmación:
   - Zombie común riggeado con animaciones de caminar, correr, atacar y morir.
   - Viewmodel de la pistola.
   - Palo borracho.
   - Textura de rombos terracota/gris.
   - Fragmento de meteorito.
3. Integrar el lote en la escena del spike para validar que el estilo de Genex funcione con el cel-shading.
4. Documentar los ajustes de prompt necesarios en `docs/spikes/genex-style.md`.

### 7.11 CI

GitHub Actions con lint, typecheck, tests, build de la landing, `level:validate` y caché de Turborepo.

### 7.12 Criterios de aceptación de la Fase 0

- `pnpm install && pnpm dev` levanta la landing y la app (development build) sin errores.
- La waitlist guarda registros en Supabase local, y la RLS impide leerlos desde el cliente.
- El informe del spike existe, con mediciones en dispositivos reales y una decisión tomada.
- El Escenario 1 en blockout se recorre completo en un dispositivo real, de principio a fin.
- El validador de niveles pasa en CI.
- El lote de prueba de Genex está integrado y evaluado, o pendiente solo de la confirmación de costo del usuario.

### 7.13 Al terminar

- Resumen de lo hecho y de lo pendiente.
- Lista de decisiones que requieren al usuario.
- Actualización de este prompt (sección 8) con las decisiones tomadas.

---

## 8. Pendientes y valores por defecto

| Tema                       | Por defecto en Fase 0                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 Dispositivos del spike | 1 iPhone de los últimos 3 años, 1 Android de gama media (~2023) y 1 Android de gama media-baja (~2021, Vulkan 1.1). Confirmar modelos con el usuario. |
| Dispositivos mínimos       | iOS 16+ y Android con Vulkan 1.1+ (se ajusta según el spike)                                                                                          |
| Hosting de la landing      | Vercel                                                                                                                                                |
| Monitoreo de crashes       | Sentry (configurado en Fase 1)                                                                                                                        |
| Monetización               | Sin implementar. La arquitectura no debe impedir compras in-app.                                                                                      |
| Logros y gamepad           | Fuera de alcance hasta Fase 3                                                                                                                         |
| Susto guionado en Zona 1   | Solo un trigger reservado, sin implementación                                                                                                         |
| Ubicación de la carta 2    | Altar                                                                                                                                                 |

## 8-bis. Decisiones tomadas durante la Fase 0

| Fecha      | Tema                             | Decisión                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-18 | 8.1 Dispositivos del spike       | Solo iPhone 13/14 (iOS 18–26). Android queda pendiente y documentado como no medido.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-10-18 | Development builds               | EAS Build en la nube. Primer objetivo: iOS Simulator (Xcode 27.1 instalado). Sin Apple Developer Program por ahora.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-10-18 | Supabase local                   | OrbStack (Docker 29.8) instalado. Entorno local con Supabase CLI 2.121 como devDependency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-10-18 | Repositorio                      | `git init` + repo público `nhsiciliano/ApocalipticBA` en GitHub.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-10-18 | Binarios                         | GLB del blockout versionados. `packages/assets/raw/` (Genex) en `.gitignore` con `manifest.json` de ids. `docs/references/**` ignorado.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-10-18 | Render                           | `react-native-wgpu` deprecado → `react-native-webgpu` 0.16.1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-10-18 | Pipeline de assets               | Hermes sin WASM: sin KTX2 ni meshopt en Fase 0. Exportar `.gltf` + `.bin` + texturas externas. Compresión nativa como ítem del spike.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-10-18 | TypeScript                       | ~6.0.3 (template Expo 58). No TS 7.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-10-18 | Blender                          | 5.2.2 LTS instalado.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-10-18 | Flujo de trabajo                 | Tareas clasificadas Bajo/Medio/Alto y delegadas a sesiones `low-dev` / `mid-dev` / `high-dev`; `planner` orquesta. Documentación de librerías vía Context7.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-10-18 | Contrato `scenario.json`         | Esquema Zod en `@apocalipticba/shared` (Hito 2). Spawns por encuentro `SPAWN_<enc>_<n>`, jugador `SPAWN_player_start_<n>`. Interactuables `INT_(note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | locked                                  | hold | climb | gate | pickup)_<id>`. Marcador de objetivo `MRK_<id>`. `PICK_<item>_<n>`con item igual al tipo.`BG_Skyline` solo en preload/unload. |
| 2026-10-18 | Formato de documentación         | Toda la carpeta `docs/` pasa por `pnpm format` (Prettier).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-10-18 | Contrato host↔core               | `@apocalipticba/game-core` (Hito 3, ADR-006). El core calcula `desiredDelta`; el host resuelve colisión y llama `commitMove`. El host registra nodos del glTF por zona (`registerZoneNodes`), informa el candidato de interacción (`setCandidate`) y reacciona a `zone.preload`/`zone.unload`. Sin spawner en Fase 0: encuentros `all_dead` terminan con `debugEndEncounter`.                                                                                                                                                                                                                                                                                                            |
| 2026-10-18 | Yaw de spawns y checkpoints      | Se toma de la rotación Z del Empty en Blender (rotación del nodo glTF); el host la convierte a yaw y la pasa en `SceneNode.yaw`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-10-18 | Path de `INT_climb`              | Coordenadas absolutas de mundo en `scenario.json`. El validador (Hito 8) avisa si el primer punto está a más de 1,5 m del nodo `INT_climb`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-10-19 | Supabase local y Edge Functions  | Hito 4 (ADR-007). `supabase/` es paquete del workspace; CLI 2.121 como devDependency. Las funciones importan `@apocalipticba/shared` por import map directo (sin copia); `shared` y `game-core` usan imports con extensión `.ts`. `waitlist-signup` con `verify_jwt = false`, honeypot y rate limit; duplicados responden `ok` (sin enumerar emails). RLS + grants mínimos: anon recibe `42501 permission denied` en `waitlist`, `scores` y `game_sessions`. Stubs de `start-session`, `submit-score` y `sync-progress` responden 501 hasta Fase 2.                                                                                                                                      |
| 2026-10-19 | Orden de hitos                   | Hito 5 (landing) pospuesto por decisión del usuario: la landing no es necesaria todavía. Se pasa directo al Hito 6 (app mobile base) y la landing se retoma cuando el usuario lo indique.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-10-19 | App mobile (Hito 6, ADR-008)     | Bundle id / package `ar.com.apocalipticba.app`. R3F sin patch: Metro resuelve `@react-three/fiber` al bundle web con `mainFields: ['module']` (template oficial de react-native-webgpu). Plan B: `three.webgpu.js` no exporta `WebGLRenderer`; `GLCanvas` usa expo-gl con el mismo `WebGPURenderer` y `forceWebGL: true`, así los materiales TSL sirven en ambos backends. Un solo reconciler de R3F (`createRoot` sobre superficie nativa) para ambos. Settings en Zustand 5 + MMKV 4 (Nitro 0.37.1; fallback expo-sqlite). Sin `eslint-plugin-react` (no soporta ESLint 10). Verificación en Simulator pendiente del login de EAS.                                                     |
| 2026-10-19 | Verificación del Hito 6          | Build EAS `development-simulator` (proyecto `@nhsiciliano/apocalipticba`, plan free) instalado en el Simulator (iPhone 17, iOS 27): navegación placeholder y cubo TSL a 60 fps en WebGPU, ajustes persistidos en MMKV. El plan B WebGL dibuja pero no presenta el frame: pendiente explícito del Hito 7. Polyfills de Hermes en `src/polyfills.ts` (`TextDecoder`, stub de `ImageBitmap`). Deep link `apocalipticba://play?backend=webgl                                                                                                                                                                                                                                                 | webgpu` para forzar backend en pruebas. |
| 2026-10-20 | 8.1 Render iOS (Hito 7, ADR-002) | **WebGPU en iOS, plan B WebGL descartado para la Fase 0, Android pendiente.** Spike en `docs/spikes/render.md`, medido solo en Simulator (sin CocoaPods ni iPhone real, por decisión del usuario): cifras no válidas para rendimiento, sí para lo funcional. 30 zombies skinned con toon TSL, inverted hull, Sobel con MRT + bloom (`RenderPipeline`, `PostProcessing` está deprecado en three 0.186), `.gltf` externo y `KHR_mesh_quantization` funcionan en WebGPU. Loaders propios en Hermes (`FileLoader` trunca con el fetch de RN 0.88; imágenes por `createImageBitmap`). `GLCanvas` queda en el código, documentado. Condición: revisar con la primera medición en iPhone 13/14. |

---

## 9. Reglas para el agente

- **No destruir archivos ajenos:** nunca borrar, mover, renombrar ni sobrescribir archivos que no hayas creado vos (incluye referencias, `.blend` editados por el usuario y reglas de `AGENTS.md`). Ante la duda, preguntá.
- **Costos de Genex:** antes de gastar créditos, informá el costo y esperá la confirmación. No regeneres assets existentes; integrá todo lo generado.
- **Referencias de terceros:** no publicarlas ni usarlas como input de generación.
- **Idioma:** textos del juego en es-AR con voseo.
- **Avance:** no avanzar a la Fase 1 sin la aprobación del usuario.
