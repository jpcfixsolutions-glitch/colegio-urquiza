# Reglas permanentes

Antes de trabajar leer `PROMPT_CODEX_IMPLEMENTACION_V1_COLEGIO.md`, `PLAN.md` y `STATUS.md`.

- Usar JavaScript/JSX; no TypeScript/TSX en el producto.
- `maqueta figma` es sólo referencia y no se modifica.
- Turso + Drizzle son la base de datos; Supabase se usa sólo como Storage.
- No modificar la migración inicial aplicada. Todo cambio de schema requiere una nueva migración versionada.
- No exponer secretos ni persistir signed URLs.
- No hacer commits con verificaciones fallando.
- Ejecutar tests/build del hito después de cada cambio relevante.
- Actualizar `STATUS.md` al terminar cada hito.
