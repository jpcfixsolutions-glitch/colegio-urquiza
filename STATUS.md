# Estado actual

## Campo de login compatible con admin bootstrap — 2026-11-01

- El campo visual de inicio de sesión conserva el formato automático para
  CUIT, pero ya no elimina letras ni `@`; por ello admite escribir o pegar
  `admin@colegio.local` en la misma entrada.
- La excepción continúa limitada en backend al administrador bootstrap y al
  rol RBAC `ADMIN`; escribir otro email no habilita su autenticación. No
  depende de variables de entorno.
- Se cambió el teclado móvil a texto para que sea posible ingresar `@` sin
  depender de un teclado numérico. La etiqueta pública se mantiene como CUIT.
- Verificaciones: frontend `node --test` (13/13) y build Vite correctos.

## Corrección de login CUIT y compatibilidad bootstrap — 2026-11-01

- Causa raíz confirmada en Turso: `employees.cuit_normalized` no existía. El
  código local la consultaba pese a que la migración no se había aplicado;
  por eso Drizzle exponía el SQL al cliente a través del mensaje de error.
- Se eliminó la dependencia de esa columna y no se alteraron CUIT, empleados
  ni vínculos existentes. El login normaliza el identificador en JavaScript y
  compara contra los CUIT de `employees`; exige una coincidencia única, de
  modo que dos formatos históricos equivalentes jamás autentican una cuenta
  ambigua. La inspección real encontró 80 empleados y cero grupos duplicados
  tras normalización.
- La excepción temporal se limita exactamente a `admin@colegio.local`.
  Además de validar contraseña y estado, comprueba que la cuenta tenga el rol
  RBAC `ADMIN`; ningún otro email puede iniciar sesión. No depende de
  variables de entorno ni se expone al frontend.
- La migración real aplicada es
  `20261101214127_optional_institutional_email`, exclusivamente para volver
  nullable el email institucional. Tras aplicarla, Turso confirmó
  `users.email` nullable y la ausencia física de `cuit_normalized`.
- Los errores inesperados devuelven un texto controlado sin SQL, tablas,
  columnas ni parámetros. El servidor conserva el log técnico interno.
- Verificaciones: backend `node --test` (26/26), E2E contra Turso para CUIT
  con y sin formato, CUIT inexistente, contraseña incorrecta, empleado sin
  cuenta, inactivo y emails normales; limpieza E2E correcta. Se confirmó que
  el bootstrap existe, está activo y posee rol `ADMIN`. La prueba de login
  exitoso con su contraseña real queda para UAT porque esa credencial no está
  disponible en este entorno.

## Corrección de cuentas administrativas con acceso personal — 2026-11-01

- Tanto Empleado como Administrador exigen una ficha de empleado/CUIT. El
  selector se conserva visible y obligatorio para ambos tipos de cuenta en alta
  y edición.
- Todo administrador recibe además el rol base `EMPLOYEE`; por eso conserva
  `PAYSLIP_VIEW_OWN` y `ANNOUNCEMENT_VIEW`, y el sidebar mantiene `Mis avisos`,
  `Mis recibos` y `Mis datos` junto a las secciones administrativas permitidas.
  Los privilegios administrativos se agregan, nunca sustituyen el acceso
  personal. Las conversiones entre tipos conservan el vínculo al empleado.
- No hubo cambios de schema ni migraciones. Verificaciones: backend 24/24,
  frontend 13/13 y build Vite correctos.

## Refactorización de cuentas y privilegios — 2026-11-01

- `Usuarios` presenta exclusivamente los tipos de cuenta Empleado y
  Administrador. Los privilegios administrativos se administran sólo para
  administradores con etiquetas amigables: recibos, avisos, personal, usuarios
  y auditoría, incluyendo acceso administrativo completo sincronizado.
- La autorización sigue usando `permissions`, `roles`, `role_permissions` y
  `user_roles`. No se modificó el schema ni se creó una migración: se agregaron
  roles internos idempotentes para composición (`ADMINISTRATOR`, gestión de
  personal, usuarios y auditoría). Los roles heredados de liquidaciones y
  comunicaciones conservan compatibilidad y se interpretan visualmente como
  administrador de Recibos o Avisos.
- Las APIs de creación y edición aceptan `accountType` y
  `administrativePrivileges`; rechazan privilegios para empleados, limpian las
  asignaciones residuales al cambiar tipo y exigen empleado asociado para una
  cuenta de empleado. Las solicitudes protegidas recalculan identidad y
  permisos en cada request, por lo que un permiso removido deja de autorizar de
  inmediato. Se protege al último administrador activo con gestión de usuarios.
- Verificaciones: seed idempotente aplicado y backend `node --test` correcto
  (23/23). Frontend `node --test` correcto (13/13) y build Vite correcto. La
  E2E administrativa quedó iniciada pero no completó por espera de conexión a
  Turso en este entorno.

## Corrección UI/UX — Gestión de recibos responsive — 2026-11-01

- En `Historial`, el filtro Año dejó de ser un campo de texto y ahora es un
  selector con `Todos` y los años presentes en los recibos disponibles,
  ordenados de forma descendente. Comparte el mismo componente, alto y grilla
  responsive que los demás filtros, sin cambiar el contrato de filtrado.
- La modal de `Carga de documentos` usa un ancho adaptable de hasta 1100 px,
  contenido con scroll vertical interno y acciones inferiores persistentes. La
  revisión mantiene todas sus columnas en escritorio y pasa a tarjetas con
  etiquetas en celular, preservando nombre, comprobante, empleado y estado sin
  scroll horizontal de la página.
- La pestaña temporal de apertura del PDF ahora declara viewport móvil, usa
  `100dvh`, área segura, tarjeta fluida, indicador de carga y pantalla de
  error comprensible. No se alteró el acceso firmado, ni las rutas ni el
  criterio de seguimiento de visualizaciones.
- No hubo cambios de backend, base de datos, migraciones ni dependencias.
  Verificaciones: frontend `pnpm test` (13/13) y `pnpm build`, ambas correctas.

## Ajuste UAT — contraseña mínima de seis caracteres — 2026-11-01

- La longitud mínima de contraseña pasó de 12 a 6 caracteres en el cambio
  obligatorio del usuario, la creación de cuentas, el restablecimiento
  administrativo y el bootstrap inicial de administrador.
- El frontend aplica el mismo mínimo y actualiza las ayudas visibles de los
  tres formularios. El costo de hash bcrypt se mantiene en 12 rondas; ese
  parámetro criptográfico no corresponde a la longitud de la contraseña.
- No hubo cambios de schema ni migraciones. Verificaciones: backend `pnpm test`
  (21/21), frontend `pnpm test` (12/12) y `pnpm build`. La E2E específica
  rechazó cinco caracteres, aceptó seis, verificó el hash y el login posterior,
  y confirmó la limpieza de todos los usuarios temporales. Un primer intento
  tuvo timeout de conexión con Turso; el reintento completo finalizó correcto.

## Corrección UAT — visor de recibos integrado en celular — 2026-11-01

- Se reemplazó el `iframe` del recibo, que en navegadores móviles delegaba al
  visor PDF del sistema y mostraba un botón `Abrir` inoperante, por un visor
  propio basado en PDF.js y canvas.
- Al tocar `Ver`, el documento se descarga y valida mediante el flujo seguro
  existente y sus páginas se renderizan directamente dentro de la aplicación.
  Se eliminó la descripción técnica de visualización solicitada en UAT.
- El visor ajusta la página al ancho disponible, permite desplazamiento
  vertical y horizontal, informa la cantidad de páginas e incorpora zoom entre
  75% y 200%. Usa el build de compatibilidad para navegadores móviles y carga
  PDF.js de forma diferida, únicamente cuando se abre un recibo.
- No hubo cambios de backend, schema ni migraciones. Las URLs firmadas siguen
  siendo efímeras y no se persisten; el registro de visualización conserva el
  flujo autenticado existente.
- Verificaciones: frontend `pnpm test` (12/12), `pnpm build` y prueba visual en
  navegador con un documento real de 14 páginas dentro de un contenedor de 390
  px. Se comprobó renderizado, desplazamiento y zoom de 100% a 125%.

## Corrección UAT — portal personal para usuarios con roles de gestión — 2026-10-31

- Los usuarios vinculados a un empleado ya no pierden sus funciones personales
  por tener permisos administrativos. El mismo shell de gestión muestra ahora
  `Mis avisos`, `Mis recibos` y `Mis datos`, además de las opciones de
  administración que correspondan.
- Se diferenciaron explícitamente `Gestionar avisos` y `Gestionar recibos` de
  las vistas personales. Abrir un documento desde el historial administrativo
  continúa sin registrar un visto del empleado; abrirlo desde `Mis recibos` sí
  crea y confirma la sesión personal de visualización.
- El backend autoriza el evento personal por la vinculación real entre el
  usuario y el empleado propietario, aunque ese usuario también posea
  `PAYSLIP_MANAGE`. Las descargas personales usan una ruta separada para no
  confundirlas con accesos administrativos.
- No hubo cambios de schema ni migraciones. Se agregó una regresión de
  navegación para cuentas con doble rol y la E2E asigna al empleado propietario
  el rol de liquidaciones antes de abrir su recibo.
- Verificaciones: frontend `pnpm test` (11/11) y `pnpm build`; backend `pnpm
  test` (21/21); `pnpm e2e:payslips` contra Turso/Supabase con limpieza y caso
  de doble rol, todas correctas. La aplicación local cargó correctamente en el
  navegador; la sesión disponible no estaba autenticada y no se utilizaron
  credenciales reales para la comprobación visual.

## Corrección UAT — visto de recibos en celular y despliegue — 2026-10-31

- La revisión de Turso confirmó que el usuario Mateo Andrés había abierto el
  recibo con el frontend anterior: existían eventos históricos de URL/vista,
  pero no se había creado ninguna `payslip_view_session` ni ningún acceso por
  versión. La implementación completa seguía fuera del último commit, por lo
  que frontend y backend desplegados no compartían el contrato nuevo.
- El visor dejó de depender de `iframe.onload`, señal inconsistente en visores
  PDF de navegadores móviles. Ahora el frontend descarga el archivo firmado,
  valida respuesta HTTP, contenido no vacío y firma `%PDF-`, confirma la sesión
  autenticada y recién entonces muestra un `blob:` local en el visor.
- Si Storage falla o responde con HTML/otro contenido, no se confirma el visto
  y se muestra el error. Las URLs firmadas siguen siendo efímeras y nunca se
  persisten. Los object URLs se revocan al cerrar o desmontar el visor.
- La sesión de confirmación se amplió a cinco minutos para conexiones móviles
  lentas, manteniendo consumo único, usuario propietario y versión inmutables.
- Se agregó `frontend/src/features/payslipViewer.js` y su regresión para PDF
  válido, error de Storage y contenido inválido.
- Verificaciones: frontend `pnpm test` (9/9) y `pnpm build`; backend `pnpm
  test` (21/21); `pnpm e2e:payslips` contra Turso/Supabase con limpieza,
  reemplazo, concurrencia, archivado y filtros administrativos, todas correctas.

## Seguimiento de visualización de recibos — 2026-10-29

- Se creó y aplicó en Turso la migración versionada
  `20261029211100_clean_ogun`. Agrega `payslip_version_accesses`, con una
  fila por versión y usuario propietario, y `payslip_view_sessions`, que
  vincula una apertura autorizada con una confirmación única de visor.
- La primera y última visualización, contador de aperturas, primera y última
  solicitud de descarga y contador de descargas se conservan por versión. Los
  upserts son atómicos y completan correctamente cada dimensión aunque el
  usuario descargue antes de visualizar o viceversa.
- El empleado abre los PDFs en un visor embebido controlado por la aplicación.
  Sólo al recibir `onLoad` de ese visor se confirma una sesión efímera
  autenticada; generar una URL firmada, listar el recibo o abrirlo como
  administrador no registra una visualización. El indicador representa que el
  navegador cargó la respuesta del PDF, no una confirmación de lectura humana.
- La solicitud de descarga se registra por separado y no cambia el estado de
  visualización. Administradores no pueden crear sesiones de visualización en
  nombre del empleado.
- El historial administrativo ahora pagina y filtra del lado del backend por
  empleado, período, tipo, estado y visualización. Muestra indicador accesible
  de doble check, estadísticas calculadas en Turso y un detalle por versión con
  fechas en `America/Argentina/Cordoba`. Los totales de publicados incluyen
  documentos ACTIVE y ARCHIVED, nunca versiones reemplazadas ni PENDING.
- Al reemplazar, la versión anterior conserva sus accesos y la nueva inicia sin
  visualizaciones. Una confirmación tardía se asocia sólo a la versión antigua,
  por lo que jamás marca la versión vigente por error. Archivar y desarchivar
  no modifica los registros.
- Verificaciones: `pnpm migrate`, `pnpm e2e:payslips` contra Turso y Supabase
  Storage con limpieza, `pnpm test` backend (21/21), y `pnpm build` más
  `pnpm test` frontend (7/7) correctos.

## Monitoreo de usuarios e historial de accesos — 2026-10-27

- Se reutilizaron `auth_sessions` y `audit_logs`; no se creó una tabla
  duplicada. La migración versionada `20261028012202_activity_monitoring` fue
  aplicada en Turso: agrega `last_activity_at`, `logged_out_at` e índice de
  actividad por sesión.
- El access token ahora contiene el identificador de sesión y cada ruta
  autenticada valida que la sesión siga vigente y no revocada. Login, logout,
  fallos de login y revocaciones escriben eventos seguros en auditoría como
  `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT` y `SESSION_REVOKED`; el refresh no
  se registra como un nuevo ingreso.
- Se agregó heartbeat autenticado: el frontend lo envía como máximo cada 60 s,
  sólo cuando la página está visible y hubo interacción reciente. Las pestañas
  del mismo origen se coordinan con `localStorage` y el backend descarta
  escrituras repetidas durante 45 s. Una sesión se considera en línea por 180
  s desde su última actividad; múltiples sesiones del mismo usuario se agregan
  sin desconectarlo antes de tiempo.
- Administración incluye estadísticas reales, navegación `Actividad`, lista de
  conexiones y un historial paginado y filtrable. `Usuarios` recibe la
  presencia en una única consulta agregada, sin N+1 por fila.
- Timestamps nuevos usan UTC de servidor. Los filtros por día convierten el
  calendario `America/Argentina/Cordoba` a límites UTC y la UI muestra siempre
  esa zona mediante `Intl.DateTimeFormat`, sin restar horas manualmente.
- Durante un despliegue gradual, una sesión creada por la versión anterior se
  considera activa sólo durante la misma ventana de 180 s a partir de su login
  (`created_at`). Las sesiones nuevas usan exclusivamente `last_activity_at`.
- Corrección posterior: las comparaciones SQL de presencia normalizan el corte
  a segundos Unix antes de comparar con las columnas integer de Turso. Antes
  se enviaba un `Date` serializado como texto, por lo que una sesión con
  actividad real no aparecía en línea. La consulta corregida verificó en Turso
  dos usuarios en línea, incluido Mateo Andrés.
- Corrección responsive móvil: la navegación lateral ahora es el área con
  scroll interno y el pie queda fijo dentro del drawer; el botón `Cerrar
  sesión` permanece visible aun con muchas entradas o una pantalla baja.
- Ajuste específico para navegadores móviles: el drawer usa `100dvh` y reserva
  52 px más el área segura inferior, de modo que el usuario y `Cerrar sesión`
  queden por encima de la barra dinámica de Chrome/Samsung Internet.
- Retención propuesta: conservar auditoría 12 meses y ejecutar una limpieza
  explícita/cron administrativo aprobado antes de eliminar datos; no se agregó
  ninguna eliminación automática.
- Verificaciones: migración aplicada; `pnpm test` backend (18/18), `pnpm
  e2e:auth` contra Turso con limpieza, `pnpm test` frontend (4/4) y `pnpm
  build` frontend pasaron.

## Implementado

- Onboarding de empleados en dos etapas: primero cambio obligatorio de
  contraseña y luego formulario obligatorio de datos personales. El perfil
  incluye email personal, domicilio, teléfono, estado civil, DNI y CUIT; queda
  disponible para el empleado en `Datos personales` y para administradores en
  `Personal`. Cada confirmación programa una revisión a los tres meses
  calendario y la interfaz vuelve a dirigir al empleado a su perfil al vencer.
- Se separó el listado mínimo para gestión de recibos del perfil administrativo
  completo para no exponer domicilio, teléfono, DNI o estado civil a roles sin
  `EMPLOYEE_MANAGE`. La migración versionada
  `20261026223111_elite_psynapse` fue aplicada correctamente en Turso.
- Recibos administrativos unificados en `Historial` y `Carga de documentos`.
  La carga abre una modal para período, tipo (Mensual, Ganancias, Notificación,
  Liquidación final o SAC), modalidad ZIP/PDF separados y notificación interna.
  El ZIP se descomprime en el navegador y cada PDF mantiene el flujo directo a
  Supabase Storage. La revisión reconoce
  `Liquidacion_MM-AAAA_CUIT_Nombre y Apellido_Nro.pdf`, permite corregir la
  asociación y procesa fallos de forma independiente.
- Se agregó CUIT único opcional a empleados y avisos de recibo nuevo para el
  usuario, mediante la migración versionada
  `20261026221626_reflective_mimic`; fue aplicada correctamente en Turso.
- CORS local admite `localhost`, `127.0.0.1` y `[::1]` con cualquier puerto
  únicamente en desarrollo; producción continúa restringida a `FRONTEND_ORIGIN`.
- Schema inicial de 15 tablas y seed RBAC; migración inicial intacta.
- Base Express, JWT, cookies refresh, permisos, áreas/empleados/usuarios, recibos, avisos y frontend JSX inicial.
- Storage firmado y endpoints de versionado/revisión masiva iniciales.
- Vercel básico y ejemplos de entorno.

## Probado automáticamente

- La suite backend pasa 15/15 tests. La E2E de autenticación verifica la
  secuencia contraseña -> perfil obligatorio -> acceso, y las E2E de
  administración y carga masiva siguen pasando contra Turso/Supabase.
- La suite backend pasa 11/11 tests; las E2E de recibos y carga masiva pasaron
  contra Turso y Supabase, incluida la asociación por CUIT y la notificación
  que queda leída al abrir el documento. Frontend pasa 4/4 tests y build Vite.
- La suite backend pasa 8/8 tests, incluida la regresión de CORS local y la
  restricción de orígenes en producción.
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

## Acceso por CUIT y vinculación de recibos (2026-10-28)

- Las cuentas vinculadas a empleados ahora inician sesión con el CUIT único del
  empleado, aceptando el valor con o sin guiones. Una cuenta que ya tiene CUIT
  no puede seguir autenticándose por email o username. Se mantiene únicamente
  una compatibilidad transitoria por email/username para cuentas administrativas
  históricas que todavía no tienen empleado/CUIT asociado.
- El campo de acceso aplica una máscara progresiva `XX-XXXXXXXX-X`: conserva
  sólo los once dígitos, agrega ambos guiones automáticamente y admite pegar un
  CUIT ya formateado. El email administrativo transitorio continúa admitido.
- Toda cuenta nueva creada desde administración exige un empleado activo con
  CUIT válido y sin otra cuenta asociada. La contraseña entregada por el
  administrador continúa marcándose como temporal y obliga a cambiarla antes
  de completar los datos personales o acceder al resto del sistema.
- El CUIT se muestra como identificador de acceso en la administración y queda
  bloqueado en el perfil del empleado una vez asociado. Los perfiles históricos
  sin CUIT pueden informarlo una única vez; los cambios posteriores quedan
  reservados a administración.
- `Mis recibos` conserva la autorización contextual por `employeeId`, que es el
  empleado único resuelto desde el CUIT de la cuenta, y sólo lista recibos en
  estado `ACTIVE`. Administradores y responsables de nómina continúan cargando
  y publicando mediante `PAYSLIP_MANAGE`.
- Verificaciones: backend `pnpm test` pasó 18/18, frontend `pnpm test` pasó 4/4
  y `pnpm build` pasó. Las E2E `pnpm e2e:auth`, `pnpm e2e:admin` y
  `pnpm e2e:payslips` pasaron contra Turso/Supabase y limpiaron sus datos y
  objetos temporales.

## Preparación de workspace para Vercel (2026-10-27)

- Se corrigieron `backend/pnpm-workspace.yaml` y
  `frontend/pnpm-workspace.yaml` agregando el campo `packages`, requerido por
  pnpm 9 en el entorno de build de Vercel. La ausencia de ese campo provocaba
  `ERROR packages field missing or empty` antes de compilar la aplicación.
- Se amplió a 15 segundos el margen de arranque de la prueba de integración del
  keep-alive para evitar falsos negativos por carga concurrente del runner; no
  cambia el comportamiento productivo.
- Verificaciones: instalación con lockfile congelado y `pnpm test` en backend
  pasaron (15/15); instalación, `pnpm test` (4/4) y `pnpm build` en frontend
  también pasaron.

## Cookie de sesión entre proyectos Vercel (2026-10-27)

- La cookie HTTP-only de refresh usa ahora `Secure`, `SameSite=None` y
  `Partitioned` en producción para admitir login, recarga y rotación de sesión
  desde un frontend servido por otro proyecto/dominio de Vercel.
- En desarrollo conserva `SameSite=Lax` y no requiere HTTPS. CORS continúa
  aceptando credenciales únicamente desde `FRONTEND_ORIGIN` en producción.
- Se agregó una regresión que valida tanto las opciones por entorno como el
  header `Set-Cookie` real serializado por Express.
- Verificación: `pnpm test` en backend pasó (16/16).

## Rediseño integral del frontend (2026-10-27)

- Se implementó un sistema visual institucional reutilizable con tokens de
  color, tipografía, espaciado, radios, sombras y estados; se mantuvieron React,
  Vite y JavaScript/JSX sin incorporar una biblioteca UI pesada.
- El login, el cambio obligatorio de contraseña y el perfil inicial fueron
  renovados con identidad del Instituto, jerarquía tipográfica más clara,
  controles accesibles y comportamiento específico para celular.
- El shell administrativo incorpora sidebar moderno y colapsable en escritorio,
  drawer móvil, topbar contextual, navegación por permisos e iconografía SVG
  local. El resumen usa únicamente endpoints existentes para mostrar personal
  activo, usuarios habilitados, recibos del mes, avisos publicados y estados que
  requieren atención; no se agregaron métricas ficticias ni cambios de backend.
- Áreas, Personal, Usuarios, Avisos y Recibos comparten encabezados, filtros,
  buscadores, badges semánticos, menús de acciones, confirmaciones y modales.
  Avisos usa un listado editorial; las tablas administrativas se convierten en
  tarjetas etiquetadas en móvil en lugar de depender del scroll horizontal.
- La carga de documentos, el historial, el reemplazo y la experiencia del
  empleado conservaron sus flujos reales, permisos, signed URLs y procesamiento
  directo a Storage. No se modificaron autenticación, contratos API, schema ni
  migraciones, y `maqueta figma` permaneció intacta.
- Verificación automática: `pnpm test` en frontend pasó (4/4) y `pnpm build`
  completó correctamente (45 módulos transformados).
- Verificación visual en navegador con una base SQLite local aislada y datos de
  prueba descartados al finalizar: login, dashboard, Áreas, Personal, Usuarios,
  Avisos, Recibos y modal de carga. Se comprobaron 320, 360, 390, 768, 1024,
  1280, 1440 y 1920 px, más el equivalente de layout a zoom 200%; no hubo
  desborde horizontal accidental ni errores de consola.
# Recuperación de contraseña asistida (2026-11-04)

- Se agregó `password_recovery_requests`, con estados `PENDING`, `RESOLVED` y
  `CANCELLED`, contador de solicitudes, marcas de resolución/cancelación y
  responsables. La restricción parcial garantiza una sola solicitud pendiente
  por usuario; no almacena CUIT ni contraseñas duplicadas.
- Se generó y aplicó la migración
  `20261104133510_wise_stryfe`; la tabla fue consultada posteriormente en
  Turso para confirmar su creación física.
- El login ahora permite solicitar recuperación con CUIT normalizado y siempre
  responde de forma genérica. Tiene límites independientes por IP y por CUIT.
  Las solicitudes reales se consolidan en la pendiente existente y quedan
  auditadas sin exponer datos de cuentas inexistentes.
- Usuarios con `USER_MANAGE` pueden listar, cancelar y resolver solicitudes
  desde la nueva pestaña `Solicitudes de recuperación` dentro de Usuarios. La
  resolución genera una temporal criptográficamente segura, reutiliza el
  servicio de reseteo existente, fuerza `mustChangePassword`, revoca sesiones
  y sólo devuelve la temporal una vez al administrador.
- Se agregaron los endpoints públicos y administrativos de recuperación, los
  eventos de auditoría `PASSWORD_RECOVERY_REQUESTED`,
  `PASSWORD_RECOVERY_RESOLVED`, `PASSWORD_RECOVERY_CANCELLED` y
  `PASSWORD_RESET_BY_ADMIN`, y la E2E `pnpm e2e:password-recovery`.
- Corrección posterior: se reparó el cierre del ternario JSX del modal de
  resolución en `UserAccounts.jsx`, que impedía compilar el frontend.
- Ajuste posterior solicitado: el endpoint valida ahora que el CUIT tenga una
  cuenta asociada antes de crear una solicitud. Un CUIT inexistente responde
  `El CUIT no está registrado en el sistema.`, no genera auditoría ni filas de
  recuperación y continúa sujeto a los límites independientes por IP y CUIT.
- Verificaciones: backend `pnpm test` pasó 26/26; migración y consulta física
  en Turso pasaron; E2E de recuperación pasó y limpió sus datos; frontend
  `pnpm test` pasó 13/13 y `pnpm build` compiló correctamente (55 módulos).
