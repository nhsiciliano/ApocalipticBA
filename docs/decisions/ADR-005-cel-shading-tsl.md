# ADR-005 — Cel-shading con materiales TSL

- **Estado:** Aceptado
- **Fecha:** 2026-10-18

## Contexto

El tono visual es un cel-shading estilo cómic: contornos de tinta gruesos, 2–3 bandas de sombreado duro y texturas pintadas a mano. Tiene que correr en teléfonos de gama media sin shadow maps dinámicos ni postproceso pesado, y los materiales deben funcionar tanto en `WebGPURenderer` como en el plan B WebGL (ver ADR-002).

## Decisión

Todo material custom se escribe en **TSL** (Three Shading Language), que compila a WGSL y a GLSL:

- **Toon de 2–3 bandas** con gradient map y rim light leve. Emisivo con pulso (~1,5 s) para los elementos del meteorito.
- **Contornos según calidad gráfica:** en baja y media, **inverted hull** en personajes, viewmodel y props clave (en la arquitectura las líneas de tinta van pintadas en la textura). En alta, además, un pase **Sobel** sobre profundidad y normales a resolución reducida.
- **Glow:** en baja y media, billboards aditivos sin bloom; en alta, bloom selectivo sobre emisivos.
- **Sin shadow maps dinámicos:** blob shadow bajo los personajes e iluminación horneada estilizada (vertex colors o lightmaps).
- **Niebla de color plano por zona**, que además limita la distancia de dibujado.
- **Paleta del meteorito** como única fuente de color saturado y emisivo: núcleo `#FF3B1F`, halo `#FF6A3D`, medio `#C4160C`, oscuro `#4A0806`, tinte de cielo y niebla `#8A3A2E` al ~35 %. La sangre es `#5C0F0F`, mate y nunca emisiva. El meteorito también se distingue por luminancia y pulso, no solo por el tono rojo, por accesibilidad (deuteranopía y protanopía).
- Los niveles de calidad (`low | medium | high`) se definen como constantes en `packages/shared` con flags de outlines, sobel, bloom, animados máximos y escala de render.

## Consecuencias

- Un único lenguaje de shaders sirve para ambos renderers.
- El costo por frame es predecible: sin sombras dinámicas, y el postproceso solo en calidad alta.
- Los contornos por inverted hull duplican la geometría de los objetos que los usan; hay que cuidar el presupuesto de triángulos.
- TSL y los nodos de postproceso de Three.js evolucionan rápido; se fija la versión (three 0.186.1) y se prueba en el spike.

## Alternativas consideradas

- **Shaders GLSL/WGSL a mano:** duplica el trabajo por renderer y se rompe al cambiar de backend.
- **Postproceso de contornos en todas las calidades:** demasiado costoso en gama baja.
- **Sombras dinámicas con shadow maps:** presupuesto de GPU inviable en mobile para el alcance del juego.
