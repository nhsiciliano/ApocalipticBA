# ADR-001 — Monorepo con pnpm workspaces y Turborepo

- **Estado:** Aceptado
- **Fecha:** 2026-10-18

## Contexto

ApocalipticBA tiene una app mobile (Expo), una landing (Astro), lógica de juego pura, esquemas compartidos, una base de datos con Edge Functions y herramientas de niveles y assets. Todo se escribe en TypeScript y comparte contratos: el esquema de `scenario.json` lo usan `game-core`, el validador de niveles y las Edge Functions. Un cambio en ese contrato tiene que verse en todos lados en el mismo commit.

El equipo es una sola persona con varias sesiones de agentes, así que importan el feedback rápido, los comandos únicos y una caché que evite repetir trabajo.

## Decisión

Un único repositorio con **pnpm workspaces** (`apps/*`, `packages/*`, `tools/*`) orquestado por **Turborepo**:

- Versiones exactas en `package.json` (salvo el rango `~` que impone Expo) y `pnpm-lock.yaml` versionado.
- Scope npm interno `@apocalipticba/*`; los paquetes internos se referencian con `workspace:*`.
- Un solo juego de configuración en `packages/config` (tsconfig, ESLint, Prettier).
- Turborepo ejecuta `build`, `lint`, `typecheck` y `test` con caché local y respeta el orden por dependencias (`^build`).
- La config de pnpm que antes iba en `.npmrc` (`engineStrict`, `autoInstallPeers`, `allowBuilds`) vive en `pnpm-workspace.yaml`, porque pnpm 11+ solo lee autenticación y registry desde `.npmrc`.

## Consecuencias

- Un comando (`pnpm lint`, `pnpm test`) cubre todo el repo, y la caché hace que repetirlo sea casi gratis.
- Los contratos compartidos se versionan junto con sus consumidores.
- Metro (Expo) y Astro requieren cuidado con la resolución de dependencias en un monorepo; se resuelve paquete por paquete en los Hitos 5 y 6.
- Las dependencias con scripts de instalación tienen que aprobarse a mano en `allowBuilds`: más fricción, pero ninguna se ejecuta sin querer.
- Node 24 no trae corepack: pnpm se instala con `npm i -g pnpm@12.14.0` y `packageManager` fija la versión.

## Alternativas consideradas

- **npm o Yarn workspaces:** sin el aislamiento estricto de dependencias de pnpm, que evita imports fantasma entre paquetes.
- **Nx:** más potente pero más pesado de configurar para un equipo de una persona; Turborepo cubre la caché y el orden de tareas con un archivo.
- **Varios repositorios:** obliga a publicar y versionar `shared` y `game-core` para cada cambio de contrato.
