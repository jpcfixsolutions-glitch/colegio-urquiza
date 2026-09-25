# Plan ejecutable V1

## H1 — Auth y RBAC E2E
Objetivo: validar bootstrap ADMIN, login, refresh, logout, cambio obligatorio y permisos reales. Módulos: `backend/src/routes/api.routes.js`, middlewares, scripts/tests. Trabajo: crear datos `e2e_*`, probar HTTP contra Turso, limpiar sólo esos datos. Pruebas: login correcto/incorrecto/inactivo, refresh revocable, 401/403 y múltiples roles. Comandos: `pnpm test`, `node src/scripts/e2e-auth.js`. Termina sólo con resultados y limpieza verificados.

## H2 — Administración
Objetivo: empleados, áreas, usuarios y roles completos. Módulos: rutas, servicios y frontend. Trabajo: CRUD lógico, vínculos y restablecimiento temporal. Pruebas: alta, edición, activación, áreas múltiples, asignar/quitar roles. Comandos: `pnpm test`, E2E HTTP. Criterio: RBAC aplicado en backend y UI.

## H3 — Recibos y reemplazo E2E
Objetivo: carga privada, acceso contextual y versionado. Módulos: storage, recibos, frontend. Trabajo: intent, upload directo, confirmación, view/download, archive y reemplazo. Pruebas: propietario/ajeno/manager, una versión ACTIVE. Comandos: E2E Turso+Supabase. Criterio: objetos `e2e_*` limpiados y DB consistente.

## H4 — Carga masiva
Objetivo: revisión por legajo y procesamiento independiente. Módulos: bulk API y UI. Trabajo: selección múltiple, correcciones, intents individuales, resumen. Pruebas: archivos válidos, sin asociación e inválidos. Comandos: frontend build y E2E. Criterio: fallos parciales no abortan éxitos.

## H5 — Avisos
Objetivo: CRUD, ALL/AREAS, lectura y vigencia. Módulos: announcements API/UI. Trabajo: edición, publicación, archivo y audiencia múltiple. Pruebas: borrador, expirado, multi-área, unread. Comandos: `pnpm test`, E2E HTTP. Criterio: sólo audiencias autorizadas ven publicados vigentes.

## H6 — Integración frontend
Objetivo: preservar maqueta con API real. Módulos: `frontend/src`. Trabajo: rutas protegidas, loading/error, formularios críticos y carga masiva. Pruebas: `pnpm build`, inspección sin mocks/TSX. Criterio: todas las acciones V1 conectadas.

## H7 — Seguridad y cierre
Objetivo: verificar configuración, tests, migraciones y Vercel. Módulos: env examples, tests, deployment docs. Trabajo: auditoría, CORS, cookies, secretos, documentación. Pruebas: backend tests, seed dos veces, build, startup, migrations. Comandos: `pnpm test`, `pnpm seed`, `pnpm build`. Criterio: Definition of Done totalmente evidenciada.
