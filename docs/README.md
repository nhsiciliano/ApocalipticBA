# Documentación del proyecto — ApocalipticBA

Carpeta única para toda la documentación viva del proyecto. Se mantiene junto al código y se actualiza en el mismo commit que el cambio que documenta.

| Carpeta / archivo | Qué contiene                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `prompt-base.md`  | Prompt base del producto (spec completa, secciones 1–9). La sección 8 se actualiza con cada decisión tomada. |
| `plan/fase-0.md`  | Plan aprobado de la Fase 0 con hitos, tareas y grado de dificultad.                                          |
| `plan/estado.md`  | Estado de avance por hito: qué sesión lo ejecutó, commit, fecha, pendientes.                                 |
| `decisions/`      | ADRs (Architecture Decision Records), formato MADR corto, numerados `ADR-NNN-titulo.md`.                     |
| `spikes/`         | Informes de spikes técnicos (`render.md`, `genex-style.md`).                                                 |
| `references/`     | Referencias visuales de uso interno. **No se publican**: el contenido binario está en `.gitignore`.          |
| `tooling/`        | Versiones fijadas del stack, requisitos de máquina y cómo se verificaron.                                    |

## Reglas

- Idioma de la documentación: español rioplatense. Código, identificadores y mensajes de commit en inglés.
- Cada decisión técnica relevante tiene su ADR antes o en el mismo commit que la implementa.
- Antes de usar una API de una librería, la sesión que implementa consulta la documentación vigente vía Context7 y registra la versión en `tooling/versiones.md` si cambia.
- Los grados de dificultad (Bajo / Medio / Alto) definen qué sesión ejecuta cada tarea: `low-dev`, `mid-dev`, `high-dev`. La sesión `planner` orquesta y verifica.
