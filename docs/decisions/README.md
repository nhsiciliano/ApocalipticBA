# Decisiones de arquitectura (ADRs)

Registro de las decisiones técnicas relevantes del proyecto, en formato MADR corto. Cada ADR se escribe antes o en el mismo commit que la implementación que justifica. Una decisión reemplazada no se borra: se marca como `Reemplazado por ADR-NNN` y se agrega el ADR nuevo.

## Índice

| ADR                                                  | Título                                   | Estado                        |
| ---------------------------------------------------- | ---------------------------------------- | ----------------------------- |
| [ADR-001](ADR-001-monorepo-pnpm-turborepo.md)        | Monorepo con pnpm workspaces y Turborepo | Aceptado                      |
| [ADR-002](ADR-002-render-webgpu-con-plan-b.md)       | Render con WebGPU y plan B en WebGL      | Propuesto, pendiente de spike |
| [ADR-003](ADR-003-supabase-backend.md)               | Supabase como backend                    | Aceptado                      |
| [ADR-004](ADR-004-blender-como-editor-de-niveles.md) | Blender como editor de niveles           | Aceptado                      |
| [ADR-005](ADR-005-cel-shading-tsl.md)                | Cel-shading con materiales TSL           | Aceptado                      |

## Plantilla

Archivo nuevo: `ADR-NNN-titulo-en-kebab-case.md`, con el siguiente esqueleto.

```markdown
# ADR-NNN — Título corto

- **Estado:** Propuesto | Aceptado | Reemplazado por ADR-NNN
- **Fecha:** AAAA-MM-DD

## Contexto

Qué problema hay y qué restricciones lo condicionan.

## Decisión

Qué se decidió, en una o dos frases claras.

## Consecuencias

Qué mejora, qué se complica y qué queda pendiente.

## Alternativas consideradas

- **Opción A:** por qué no.
- **Opción B:** por qué no.
```
