# Estado actual

## Implementado

- Schema inicial de 15 tablas y seed RBAC; migración inicial intacta.
- Base Express, JWT, cookies refresh, permisos, áreas/empleados/usuarios, recibos, avisos y frontend JSX inicial.
- Storage firmado y endpoints de versionado/revisión masiva iniciales.
- Vercel básico y ejemplos de entorno.

## Probado automáticamente

- Dos tests unitarios mínimos pasan: path seguro y creación de app.
- Frontend build pasó antes de este hito.
- Seed idempotente pasó dos veces contra Turso.
- H1 Auth/RBAC E2E completado contra Turso: login válido/incorrecto/inactivo,
  cambio obligatorio de contraseña, refresh rotativo y revocable, logout,
  401/403 y permisos combinados de múltiples roles. La suite limpia y verifica
  la eliminación de todos los datos `e2e_auth_`.
- H2 Administración E2E completado contra Turso: CRUD lógico de áreas y
  empleados, áreas múltiples, activación/desactivación, cuentas vinculadas,
  asignación/quita de roles y restablecimiento temporal de contraseña. La suite
  limpia y verifica la eliminación de todos los datos `e2e_admin_`.
- H3 Recibos E2E completado contra Turso y Supabase Storage: upload intent,
  subida privada directa, confirmación, vista/descarga contextual, denegación
  cruzada, reemplazo con una única versión ACTIVE y archivo. La suite limpia y
  verifica DB y objetos creados.
- H4 Carga masiva completado: revisión asistida por legajo/período, corrección
  de empleado, período y tipo antes de la carga, intents por archivo y resumen
  independiente. `pnpm build` pasó y `pnpm e2e:bulk` verificó contra Turso y
  Supabase un PDF válido, uno sin asociación, uno inválido y un fallo parcial
  sin abortar el éxito; la suite limpia datos `e2e_bulk_` y objetos creados.
- H5 Avisos completado: CRUD/publicación/archivo con audiencia ALL o AREAS,
  lectura y contador de no leídos. Se reforzó la autorización contextual de
  lectura y marcado para no revelar avisos de otra audiencia, borradores ni
  vencidos. `pnpm test` y `pnpm e2e:announcements` pasaron; esta última limpia
  los datos `e2e_announcement_` creados.
- H6 Integración frontend completada: sesión y refresh, cambio obligatorio de
  contraseña, recibos privados, avisos y marcado de lectura, carga individual
  y masiva, y las pantallas administrativas consumen la API real. Las opciones
  se muestran según permisos. `pnpm build` pasó y `frontend/` no contiene
  archivos TS/TSX productivos.
- H7 Seguridad y cierre completado: ejemplos de entorno sin secretos, CORS y
  cookies configurados, bucket privado documentado y guía de despliegue
  ampliada. `pnpm test`, migraciones, seed dos veces, build y arranque de API
  pasaron; se ejecutaron E2E de auth, administración, recibos, carga masiva y
  avisos con limpieza aislada.

## Sólo sintáctico / no validado E2E

- No hay flujos V1 pendientes de validación E2E de backend; la interacción
  visual del frontend fue verificada mediante compilación, no navegador E2E.

## Ronda UAT / prueba funcional manual — 2026-09-22

- Corrección UAT — race condition en `Mis recibos`: avisos y recibos ahora usan
  estados de consulta independientes; al alternar pestañas se desmonta y aborta
  la consulta saliente. El cargador central invalida respuestas obsoletas con
  una compuerta monotónica, limpia ítems mientras carga y propaga la señal al
  refresh autenticado. Las tarjetas sólo se renderizan si el recibo tiene id,
  período y tipo documental válidos, por lo que objetos parciales o de avisos
  no muestran acciones de recibo. `pnpm test` y `pnpm build` en `frontend`
  pasaron, incluyendo una prueba determinista de alternado rápido repetido y
  cancelación de request.

- Se corrigió el acceso de EMPLOYEE a `Mis recibos`: la sección es visible en
  escritorio y móvil para `PAYSLIP_VIEW_OWN`, consume exclusivamente
  `/api/me/payslips` y los endpoints autenticados de vista/descarga, y muestra
  estados de carga, vacío y error.
- Se normalizó `expiresAt` de avisos: `null`, vacío y ausencia de valor se
  persisten como `null`, sin coerción a Unix epoch. El filtro de vigencia de
  Turso compara en segundos mediante `unixepoch()` para excluir vencidos tanto
  del listado como del contador de no leídos.
- Verificaciones de estas correcciones: `pnpm test` en `backend`,
  `pnpm e2e:announcements` contra Turso y `pnpm build` en `frontend` pasaron.
- Se corrigió el crash de `Carga masiva`: `Admin` referenciaba
  `BulkPayslipUpload` sin que el componente existiera. Se restauró la vista
  completa de revisión, corrección, preparación, subida directa y confirmación
  independiente por archivo.
- Optimización detectada durante UAT — la carga masiva ahora usa una cola con
  concurrencia máxima centralizada de 4 flujos completos e independientes
  (`intent → subida directa a Supabase → confirmación`). Cada fila muestra
  `PENDIENTE`, `SUBIENDO`, `CONFIRMANDO`, `OK` o `ERROR`; los `UNMATCHED` se
  excluyen explícitamente de la cola y el progreso global muestra procesados
  sobre el total. El contenedor aprovecha el ancho de escritorio sin scroll
  horizontal innecesario y mantiene scroll responsivo en móvil. Una prueba con
  20 fixtures PDF válidos (dos sin asociación y dos fallos controlados) midió
  un máximo de 4 uploads activos, confirmó que las fallas no detienen el resto
  y verificó el resumen/estados finales. `pnpm test` y `pnpm build` en
  `frontend`, más `pnpm test` y `pnpm e2e:bulk` en `backend`, pasaron.
- Se completaron las pantallas administrativas de áreas, personal y usuarios:
  altas, edición, activación/desactivación, áreas múltiples, vínculo de cuenta,
  roles y restablecimiento de contraseña temporal, respetando los permisos.
- Se completó la gestión de avisos con audiencias ALL/AREAS, selección múltiple
  de áreas, vencimiento, prioridades, edición, publicación y archivo. La lectura
  de áreas se habilitó para `ANNOUNCEMENT_MANAGE` exclusivamente como dato de
  selección de audiencia; las mutaciones de áreas continúan con
  `EMPLOYEE_MANAGE`.
- La carga individual ahora expone tipo documental, validaciones visibles,
  estados de preparación/subida/confirmación y bloqueo de doble envío, sin
  enviar PDFs por Express.
- Se agregaron estados loading/empty/error, feedback de mutaciones y un Error
  Boundary por sección administrativa para evitar que un fallo derribe el shell.
- Verificaciones de la ronda: `pnpm test` en `backend` pasó (2/2) y `pnpm build`
  en `frontend` pasó. La revisión estática confirmó que las rutas de las vistas
  administrativas y el componente de carga masiva están definidos en JSX.

## Mejora / faltante detectado durante UAT — Recibos

- Se unificaron las entradas administrativas `Cargar recibos` y `Carga masiva`
  en una única sección `Recibos`. Su vista inicial es `Historial`, con las
  pestañas `Carga individual` y `Carga masiva` reutilizando los componentes y
  el flujo ya existentes.
- `Historial` consume `GET /api/admin/payslips`, permite filtrar por empleado,
  año, mes, tipo documental y estado, y muestra empleado, período, tipo,
  estado y acciones. Incluye estados de carga, vacío, error y reintento.
- Desde el historial se puede ver el PDF mediante URL firmada, archivar con el
  endpoint real y reemplazar mediante `replacement-intent → signed upload →
  replacement-confirm`; la versión anterior se conserva como `REPLACED`.
- Se ajustó la autorización de vista/descarga para admitir `PAYSLIP_VIEW_OWN`
  o `PAYSLIP_MANAGE`, manteniendo la autorización contextual por recibo.
- Verificaciones: `pnpm test` en `frontend` (4/4), `pnpm test` en `backend`
  (2/2) y `pnpm build` en `frontend` pasaron.

## Corrección crítica UAT — autenticación y desactivación (2026-09-22)

- Causa raíz: la mutación administrativa de usuarios mezclaba estado de cuenta
  y `mustChangePassword` en un `UPDATE` genérico, mientras que la desactivación
  no revocaba las filas activas de `auth_sessions`. En esta revisión del código
  no se encontró un `UPDATE` de desactivación que escribiera directamente
  `passwordHash`, por lo que la reversión observada en UAT no era reproducible
  de forma aislada; el diseño previo tampoco imponía una frontera que la
  previniera o hiciera auditable.
- Se creó `backend/src/services/user-security.service.js`. Sólo
  `changeOwnPassword` y `resetPasswordWithTemporaryCredential` escriben
  `passwordHash`; `updateUserAccountState` sólo admite `active` y
  `forcePasswordChange`. Reactivar o desactivar no puede cambiar la contraseña.
- Al desactivar, `revokeActiveSessions` marca revocadas todas las sesiones
  activas del usuario. El middleware vuelve a obtener la identidad desde Turso
  en cada ruta protegida, por lo que un access token emitido antes de la baja
  también queda rechazado. Login sigue respondiendo el mensaje público genérico
  `Usuario o contraseña incorrectos` para cuentas inactivas.
- `backend/src/routes/api.routes.js` delega reset, cambio de contraseña y
  activación/desactivación al servicio. El reset y el cambio obligatorio
  sustituyen el hash, dejando inválida la contraseña temporal cuando se guarda
  la nueva. El reset administrativo también revoca sesiones existentes.
- Se amplió `backend/src/scripts/e2e-admin.js` con la regresión completa:
  `temporal → cambio obligatorio → logout → nueva → desactivar → login/token/
  refresh rechazados → reactivar → nueva aceptada`, verificando además por
  bcrypt que el hash temporal no reaparece y que todas las sesiones quedan
  revocadas. Se actualizó una expectativa obsoleta de lectura de áreas para
  selección de audiencias en `backend/src/scripts/e2e-auth.js`; no se
  modificaron roles ni permisos.
- Verificaciones: `pnpm e2e:auth`, `pnpm e2e:admin` y `pnpm test` en backend,
  más `pnpm test` y `pnpm build` en frontend, todas correctas. Las E2E limpiaron
  sus datos `e2e_auth_` y `e2e_admin_`.

## Investigación aislada UAT — reset y cambio obligatorio (2026-09-22)

- Se agregó `backend/src/scripts/e2e-password-change.js` y el comando
  `pnpm e2e:password-change`. La prueba usa Turso real, sin desactivar ni
  reactivar usuarios, y verifica sin registrar valores sensibles que el mismo
  `users.password_hash` usado por login acepta la temporal después del reset y,
  después de `POST /auth/change-password`, rechaza la temporal y acepta la
  nueva. También confirma que `mustChangePassword` pasa a `false` en la misma
  sentencia `UPDATE`, realiza logout y prueba ambos logins por API.
- Resultado: la E2E pasó contra la base real y limpió todos los datos
  `e2e_password_change_`. La inspección estática encontró una sola tabla de
  credenciales (`users.password_hash`), sin caché de hashes ni una segunda
  escritura fuera de reset, cambio de contraseña, creación/bootstrap y datos
  de prueba. Login valida precisamente esa misma columna.
- Con esta evidencia, la reproducción reportada no corresponde al backend de
  este checkout ni a la base configurada en su `.env`; para determinar la causa
  del UAT pendiente hace falta identificar la URL y revisión/despliegue exactos
  que recibió la prueba. No se modificó la lógica de desactivación/reactivación
  durante este aislamiento.

## Riesgos conocidos

- Antes de producción deben definirse secretos JWT persistentes y distintos en
  el proveedor de despliegue; el repositorio sólo contiene placeholders.

## Próximo hito

Todos los hitos H1–H7 están completados y verificados según los comandos
registrados arriba.

## Ronda final de UX posterior a UAT (2026-09-27)

- El muro ahora muestra fecha de publicación, prioridad persistente, estado
  leído/no leído y separación temporal (Hoy, Ayer o fecha), sin modificar la
  consulta de audiencia, vencimiento ni lectura.
- La carga individual mantiene una tarjeta de confirmación con empleado,
  período, tipo y resultado. La carga masiva conserva el límite de 4 workers
  y usa todo el ancho disponible en escritorio; el scroll horizontal queda
  reservado para móvil.
- La apertura de PDF conserva la pestaña iniciada por el gesto del usuario,
  pero muestra “Abriendo recibo…” mientras se obtiene la URL firmada y un
  estado de error en la misma pestaña si falla.
- Se reemplazaron las confirmaciones nativas por una modal de la aplicación
  para archivar/desarchivar recibos, archivar avisos y activar/desactivar
  empleados o cuentas. La modal explica el alcance y bloquea doble envío.
- Se agregó `POST /api/payslips/:id/unarchive`, protegido por
  `PAYSLIP_MANAGE`, con validación de archivo activo y auditoría
  `PAYSLIP_UNARCHIVED`. La E2E de recibos verifica que el administrador abre
  un archivado, que el empleado no lo ve archivado y que lo vuelve a ver tras
  desarchivarlo.
- Los campos de contraseña usan control accesible mostrar/ocultar. Las cuentas
  distinguen visualmente Activa/Inactiva de Cambio pendiente/Contraseña normal,
  y el reset de una cuenta inactiva informa explícitamente que no la activa.
- Verificaciones: `pnpm test` y `pnpm build` en frontend, y `pnpm test` más
  `pnpm e2e:payslips` en backend, correctos.

## Pulido final de etiquetas e identidad visual (2026-09-27)

- Se agregó `frontend/src/uiLabels.js`, con el mapa explícito `UI_LABELS` y el
  formatter `formatTechnicalLabel`. El normalizador de presentación traduce
  enums y estados visibles sin modificar sus valores internos ni contratos API.
- Se reutilizó `frontend/src/imgs/Isologotipo IMSU - RGB.png` en login, sidebar
  administrativa y cabeceras autenticadas, manteniendo sus proporciones.
- Verificaciones: `pnpm test` (4/4) y `pnpm build` en frontend, correctos.

## Keep-alive de Supabase Free (2026-09-27)

- Se agregó `GET /api/cron/supabase-keepalive` exclusivamente en backend. Exige
  `Authorization: Bearer $CRON_SECRET` y compara el secreto de forma segura;
  sin credencial o con una incorrecta responde 401.
- Con una credencial válida utiliza el cliente backend de Supabase para ejecutar
  `UPDATE public.keepalive SET touched_at = ... WHERE id = 1`; responde sólo
  `{ ok: true }` y transforma fallas de Supabase en un 500 sin exponer detalles.
- `backend/vercel.json` programa el endpoint diariamente con `0 12 * * *`.
  `DEPLOYMENT.md` y `.env.example` incorporan `CRON_SECRET` y su generación
  segura. No se modificaron Turso, RBAC ni el frontend.
- Verificación: `pnpm test` en `backend` pasó (6/6), incluyendo los cuatro
  casos del keep-alive: sin autorización, autorización incorrecta, autorización
  válida con actualización y fallo controlado de Supabase.

## Corrección de carga de CRON_SECRET (2026-09-28)

- Causa raíz: el runtime dependía de varios `import "dotenv/config"` implícitos.
  Esas cargas resuelven `.env` desde el `cwd` y, por defecto, no reemplazan una
  variable ya heredada por el proceso. Por eso el proceso Express podía conservar
  un `CRON_SECRET` distinto al archivo `backend/.env` y rechazar su bearer.
- Se centralizó la carga en `src/config/env.js`: resuelve explícitamente
  `backend/.env`, reemplaza variables heredadas sólo en desarrollo/test y deja
  que producción conserve las variables del proveedor. `src/server.js` carga
  esa configuración antes de importar dinámicamente la app; `db` y `supabase`
  reutilizan el mismo módulo.
- El handler del keep-alive ya no captura el secreto al construir la ruta: lo
  obtiene al atender cada request. Se añadió integración por proceso hijo que
  inicia el mismo `src/server.js` usado por `pnpm dev`, carga un env aislado y
  verifica `Authorization: Bearer <CRON_SECRET>` con respuesta 200 y operación
  HTTP de Supabase.
- Verificación: `pnpm test` en `backend` pasó (7/7).
