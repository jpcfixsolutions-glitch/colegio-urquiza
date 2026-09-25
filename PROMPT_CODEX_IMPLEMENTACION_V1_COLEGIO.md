# PROMPT DEFINITIVO PARA CODEX — APP COLEGIO V1

## OBJETIVO

Completá la V1 de esta aplicación escolar sobre la base técnica ya preparada.

NO rediseñes el proyecto desde cero. Primero inspeccioná todo el repositorio y entendé qué ya existe. Después implementá la aplicación respetando estrictamente la arquitectura, el schema Drizzle, las migraciones, Supabase Storage y la maqueta visual existente.

Si existen `AGENTS.md`, `progress.md` o `domain.md`, leelos antes de modificar código y respetá sus reglas. Si existe `progress.md`, actualizalo al finalizar cada módulo importante.

No hagas commits si las verificaciones no pasan.

---

## STACK OBLIGATORIO

### Backend
- Node.js
- JavaScript puro
- ES Modules (`import` / `export`)
- Express
- API REST
- Turso
- Drizzle ORM
- JWT
- Supabase Storage únicamente para archivos
- Deploy previsto en Vercel

### Frontend
- React
- Vite
- JavaScript + JSX
- NO TypeScript
- NO TSX
- Consumo de API REST
- Deploy previsto en Vercel

### No cambiar
- No reemplazar Turso.
- No reemplazar Drizzle.
- No reemplazar JWT por Supabase Auth.
- No usar Supabase Database como base principal.
- No convertir el proyecto a TypeScript.
- No rehacer la interfaz visual desde cero.
- No guardar PDFs dentro de Turso.
- No hacer público el bucket de recibos.
- No exponer `SUPABASE_SECRET_KEY` en frontend.
- No pasar PDFs por Express cuando puedan ir directamente a Supabase mediante signed upload.

---

## ESTADO ACTUAL A RESPETAR

La infraestructura base ya fue preparada manualmente.

Backend esperado:

```text
backend/
├── drizzle.config.js
├── drizzle/
├── src/
│   ├── config/
│   │   ├── db.js
│   │   └── supabase.js
│   ├── db/
│   │   ├── schema.js
│   │   └── seed.js
│   └── services/
│       └── storage.service.js
└── ...
```

### Supabase Storage

Existe un bucket privado:

```text
payslips
```

La conexión y el flujo de signed URLs ya fueron probados manualmente.

`storage.service.js` debe conservar/reutilizar funciones equivalentes a:

```text
buildPayslipPath(...)
createPayslipUploadUrl(...)
createPayslipViewUrl(...)
createPayslipDownloadUrl(...)
```

Convención de almacenamiento:

```text
employees/{employeeUUID}/{year}/{month}/{uuid}.pdf
```

Nunca usar DNI, CUIL, salario, nombre completo u otro dato sensible en el path.

### Turso / Drizzle

Existe una migración inicial ya aplicada.

NO recrear la base.
NO modificar retroactivamente la migración inicial aplicada.
Si hace falta modificar schema, crear una nueva migración.

Tablas actuales:

```text
users
auth_sessions
roles
permissions
user_roles
role_permissions
employees
areas
employee_areas
payslips
payslip_versions
announcements
announcement_areas
announcement_reads
audit_logs
```

Existe además `__drizzle_migrations`.

Flujo de DB obligatorio:

```text
modificar schema
-> drizzle-kit generate
-> revisar
-> drizzle-kit migrate
```

No usar `drizzle-kit push` como sustituto de migraciones versionadas.

---

## ROLES Y PERMISOS EXISTENTES

Roles:

```text
EMPLOYEE
ADMIN
PAYROLL_MANAGER
COMMUNICATION_MANAGER
```

Permisos:

```text
PAYSLIP_VIEW_OWN
PAYSLIP_MANAGE
ANNOUNCEMENT_VIEW
ANNOUNCEMENT_PUBLISH
ANNOUNCEMENT_MANAGE
EMPLOYEE_MANAGE
USER_MANAGE
AUDIT_VIEW
```

Distribución:

```text
EMPLOYEE
- PAYSLIP_VIEW_OWN
- ANNOUNCEMENT_VIEW

PAYROLL_MANAGER
- PAYSLIP_VIEW_OWN
- PAYSLIP_MANAGE
- ANNOUNCEMENT_VIEW

COMMUNICATION_MANAGER
- PAYSLIP_VIEW_OWN
- ANNOUNCEMENT_VIEW
- ANNOUNCEMENT_PUBLISH
- ANNOUNCEMENT_MANAGE

ADMIN
- PAYSLIP_VIEW_OWN
- PAYSLIP_MANAGE
- ANNOUNCEMENT_VIEW
- ANNOUNCEMENT_PUBLISH
- ANNOUNCEMENT_MANAGE
- EMPLOYEE_MANAGE
- USER_MANAGE
- AUDIT_VIEW
```

Nunca hardcodear autorización por nombre de cargo, por ejemplo:

```js
if (user.role === "DIRECTOR")
```

La autorización real debe ser por permisos.

---

## REGLAS DEL MODELO DE DATOS

### Usuarios
- Email y username son únicos sin distinguir mayúsculas/minúsculas.
- Respetar `active`, `mustChangePassword`, `lastLoginAt`, `passwordChangedAt`.

### Empleados
- `employees.userId` es opcional y único.
- Un empleado puede existir sin tener usuario.
- `employeeNumber` / legajo es único.
- Un empleado puede pertenecer a múltiples áreas mediante `employee_areas`.
- No simplificar esto a `employees.areaId`.

### Recibos
- `payslips` representa el documento lógico.
- `payslip_versions` representa los archivos físicos.
- No fusionar ambas tablas.
- Puede haber más de un recibo en un mismo mes.
- No crear una restricción única `employee + year + month`.

Tipos:

```text
SALARY
SAC
VACATION
FINAL_SETTLEMENT
ADJUSTMENT
OTHER
```

Estados de `payslips`:

```text
PENDING
ACTIVE
ARCHIVED
```

Estados de `payslip_versions`:

```text
PENDING
ACTIVE
REPLACED
FAILED
```

Existe una restricción que permite una sola versión `ACTIVE` por `payslip`.

Al reemplazar:

```text
versión anterior -> REPLACED
nueva versión -> ACTIVE
```

No sobrescribir silenciosamente el PDF previo.

### Avisos

Estados:

```text
DRAFT
PUBLISHED
ARCHIVED
```

Prioridades:

```text
NORMAL
IMPORTANT
URGENT
```

Audiencias:

```text
ALL
AREAS
```

Si la audiencia es `AREAS`, usar `announcement_areas`.

---

# FRONTEND: MAQUETA FIGMA

En el repositorio existe una carpeta llamada exactamente:

```text
maqueta figma
```

Esa carpeta contiene el código maqueta importado/exportado desde Figma y actualmente está hecho principalmente en TypeScript/TSX.

## Regla principal

`maqueta figma` es una REFERENCIA VISUAL Y FUNCIONAL.

NO desarrollar el frontend final dentro de esa carpeta.
NO borrar esa carpeta.
NO modificarla innecesariamente.
NO convertir esa carpeta directamente en el frontend productivo.

El frontend productivo debe quedar en:

```text
frontend/
```

usando:

```text
Vite
React
JavaScript
JSX
```

NO usar TypeScript en `frontend/`.

## Conversión requerida

Inspeccioná completamente `maqueta figma/` y transcribí/adaptá su interfaz a `frontend/`.

Convertir correctamente:

```text
.tsx -> .jsx
.ts -> .js
```

No basta con renombrar extensiones.

Eliminar/adaptar correctamente:

```text
interfaces
type aliases
anotaciones de tipos
genéricos TypeScript
React.FC<Props>
casts `as Type`
configuración exclusiva de TypeScript
```

El resultado debe ser JavaScript/JSX válido.

## Fidelidad visual

La maqueta es la fuente principal del diseño.

Conservar, salvo incompatibilidad técnica real:

```text
layout
componentes
jerarquía visual
espaciados
tipografía
colores
tablas
cards
formularios
modales
navegación
responsive design
iconografía
assets
estados visuales
```

No rediseñar arbitrariamente.

Los datos mock deben ser reemplazados por datos reales de la API.

Los botones y pantallas correspondientes a funcionalidades reales deben quedar conectados.

Si existen pantallas fuera del alcance de V1, no inventar backend sólo para soportarlas.

Inspeccionar las dependencias de la maqueta antes de instalar nuevas.
No duplicar librerías que resuelvan lo mismo.

El frontend final debe iniciar mediante Vite y compilar sin TypeScript.


## Compatibilidad obligatoria entre la maqueta existente y el backend

IMPORTANTE: la maqueta/frontend fue creada ANTES de definir y preparar completamente el backend, el schema y los contratos de API.

Por lo tanto, NO asumir que los nombres de campos, estructuras de datos, acciones, flujos o endpoints que aparecen en `maqueta figma` coinciden exactamente con el backend actual.

Codex debe inspeccionar ambos lados y hacer que ENCAJEN correctamente.

La prioridad es:

```text
preservar la experiencia y flujo visual de la maqueta
+
respetar las reglas de dominio, seguridad y persistencia ya definidas
```

Si existe una diferencia entre lo que la maqueta espera y lo que actualmente ofrece el backend, Codex debe adaptar la integración de forma razonable.

Puede hacerlo mediante:

```text
- adaptar controllers
- adaptar DTOs / respuestas de API
- adaptar services
- agregar endpoints REST necesarios
- mapear nombres de campos entre frontend y backend
- transformar respuestas antes de enviarlas al frontend
- agregar endpoints agregados/de conveniencia para una pantalla
- ajustar lógica del frontend cuando el cambio sea puramente técnico
```

NO obligar al frontend a exponer directamente la estructura interna de la base de datos.

Por ejemplo, una pantalla puede necesitar un objeto conveniente como:

```js
{
  employeeName,
  periodLabel,
  documentTypeLabel,
  canDownload
}
```

aunque internamente esos datos provengan de varias tablas.

En ese caso el backend puede construir una respuesta adecuada para la pantalla en vez de obligar al frontend a reproducir joins o reglas de negocio.

### Qué debe priorizarse ante una incompatibilidad

Si la incompatibilidad es sólo de contrato o representación:

```text
adaptar preferentemente el backend/API para encajar limpiamente con el frontend
```

siempre que esto NO viole:

```text
schema existente
seguridad
RBAC
privacidad
versionado de recibos
reglas de negocio
integridad de datos
```

Si la maqueta exige algo que realmente implica una capacidad nueva de dominio que el backend no posee:

1. Detectar y documentar la diferencia.
2. Determinar si pertenece al alcance real de la V1.
3. Si pertenece a V1, implementarla correctamente.
4. Si requiere modificar schema, hacerlo mediante una NUEVA migración.
5. No editar la migración inicial ya aplicada.
6. No inventar datos falsos para hacer que la pantalla “parezca funcionar”.

Si la maqueta contiene una decisión visual o de UX incompatible con seguridad, prevalece seguridad.

Ejemplo:

```text
La maqueta recibe un payslipId y muestra un botón Descargar.
```

Eso NO habilita descarga directa.

Debe seguir existiendo:

```text
frontend
-> endpoint backend
-> autenticación
-> autorización sobre el recibo
-> signed URL temporal
-> Supabase Storage
```

### Regla de resultado

Al finalizar, el usuario no debería notar que frontend y backend fueron diseñados en momentos distintos.

La integración final debe sentirse como un único sistema coherente.

No dejar componentes conectados a mocks por el simple hecho de que el contrato real sea distinto.
No borrar funcionalidades visuales válidas sólo porque no coincidan uno a uno con el primer diseño del backend.
No cambiar el diseño visual innecesariamente para acomodar una API.

Cuando sea posible, adaptar la API y la capa de integración para que el backend encaje correctamente con el frontend existente.

---

## ARQUITECTURA BACKEND

Mantener separación por responsabilidades:

```text
src/
├── config/
├── controllers/
├── db/
├── middlewares/
├── models/        # solo si el proyecto realmente lo necesita
├── routes/
├── services/
├── validators/
├── utils/
├── app.js
└── server.js
```

### Controllers
Solo:
- HTTP
- params/body/query
- status codes
- respuesta
- delegación

### Services
- lógica de negocio
- coordinación Turso + Storage
- versionado
- audiencias
- autorización contextual
- auditoría

### Routes
- endpoint
- middleware
- controller

### Middlewares mínimos

```text
authenticateJWT
requirePermission
errorHandler
validation middleware
```

Toda interacción con Supabase Storage pasa por `storage.service.js`.

No llamar directamente a `supabase.storage` desde controllers.

---

# AUTENTICACIÓN

Implementar JWT completo con:

```text
Access Token corto
Refresh Token revocable
```

Recomendación:

```text
Access Token: 10-15 minutos
Refresh Token: mayor duración
```

Guardar solamente el HASH del refresh token en `auth_sessions.refresh_token_hash`.

Preferir refresh token en cookie:

```text
HttpOnly
Secure en producción
SameSite apropiado
```

Nunca almacenar password o refresh token en texto plano.

Usar Argon2id o bcrypt correctamente configurado.

Endpoints:

```text
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/change-password
```

Usuario inactivo: acceso rechazado.

Implementar mecanismo seguro para crear el primer ADMIN sin hardcodear una contraseña en el repo.
Puede existir un `bootstrap-admin` que reciba credenciales por variables de entorno o argumentos y fuerce `mustChangePassword = true`.

---

# AUTORIZACIÓN

Crear middleware reusable:

```js
requirePermission("PAYSLIP_MANAGE")
```

Los permisos salen de:

```text
users
 -> user_roles
 -> roles
 -> role_permissions
 -> permissions
```

El frontend puede ocultar opciones por UX, pero el backend siempre valida.

---

# EMPLEADOS Y USUARIOS

## Empleados

Con `EMPLOYEE_MANAGE`:

```text
crear
editar
activar/desactivar
asignar múltiples áreas
quitar áreas
buscar
filtrar
listar
```

No borrar físicamente como flujo normal.

## Usuarios

Con `USER_MANAGE`:

```text
crear cuenta
vincular a empleado
activar/desactivar
asignar/quitar roles
forzar cambio de contraseña
restablecer credencial temporal
```

No permitir que frontend determine permisos directamente.

---

# RECIBOS DE SUELDO

Este módulo es prioritario.

Uno o más usuarios especiales con:

```text
PAYSLIP_MANAGE
```

deben poder cargar recibos de TODOS los empleados.

Los empleados comunes NO suben recibos.

Un empleado con `PAYSLIP_VIEW_OWN` sólo puede ver sus propios recibos.

## Flujo de subida

NO enviar el PDF completo a Express.

Implementar:

```text
1. frontend solicita upload intent
2. backend autentica
3. backend verifica PAYSLIP_MANAGE
4. backend valida empleado, período y metadata
5. backend crea payslip/payslip_version PENDING
6. backend genera storagePath
7. backend genera signed upload URL/token
8. frontend sube PDF directamente a Supabase
9. frontend confirma subida
10. backend verifica el objeto
11. versión pasa a ACTIVE
12. payslip pasa a ACTIVE
13. registrar auditoría
```

Turso y Supabase no comparten transacción: manejar estados parciales y errores.

Endpoints funcionalmente equivalentes a:

```text
GET  /api/me/payslips
GET  /api/payslips/:id/view
GET  /api/payslips/:id/download
GET  /api/admin/payslips

POST /api/payslips/upload-intents
POST /api/payslips/:id/confirm

POST /api/payslips/:id/replacement-intent
POST /api/payslips/:id/replacement-confirm

POST /api/payslips/:id/archive
```

Para `view` y `download`, validar:

```text
payslip.employeeId === currentUser.employeeId
```

O permiso:

```text
PAYSLIP_MANAGE
```

Nunca autorizar sólo porque el usuario conoce un UUID.

No guardar signed URLs en Turso.

---

# CARGA MASIVA

La persona encargada debe poder cargar muchos PDFs de empleados en una sola operación administrativa.

Implementar UX de carga múltiple.

Si el nombre del archivo contiene un legajo reconocible, permitir detección asistida.

Ejemplo:

```text
1234_2026_09.pdf
```

puede sugerir:

```text
legajo 1234
año 2026
mes 09
```

Pero no publicar automáticamente asociaciones dudosas.

Antes de subir, mostrar revisión:

```text
archivo
empleado detectado
período
tipo
estado
```

Permitir corregir asociaciones.

Procesar cada PDF individualmente para que el fallo de uno no invalide todos.

Mostrar resumen:

```text
exitosos
fallidos
pendientes
sin asociación
```

El path final en Supabase sigue usando UUIDs y nunca datos personales.

---

# VALIDACIÓN DE PDFs

Para recibos V1 aceptar:

```text
application/pdf
```

Aunque el bucket permita otros tipos.

Validar:

```text
extensión
MIME
tamaño máximo
metadata
```

No confiar sólo en `accept` del navegador.

Usuario común nunca puede generar upload intents.

---

# AVISOS

Usuarios con:

```text
ANNOUNCEMENT_PUBLISH
ANNOUNCEMENT_MANAGE
```

pueden crear/administrar avisos.

Audiencia:

```text
ALL
AREAS
```

`AREAS` admite una o varias áreas.

Empleado con `ANNOUNCEMENT_VIEW` debe ver:

```text
avisos ALL
+
avisos de cualquiera de sus áreas
```

solo cuando estén publicados y vigentes.

Usar `announcement_reads` para leído/no leído.

Endpoints equivalentes a:

```text
GET  /api/announcements
GET  /api/announcements/unread-count
GET  /api/announcements/:id
POST /api/announcements/:id/read

POST  /api/announcements
PATCH /api/announcements/:id
POST  /api/announcements/:id/publish
POST  /api/announcements/:id/archive
```

No agregar WebSockets/event bus para V1 salvo necesidad técnica real.

---

# AUDITORÍA

Usar `audit_logs`.

Registrar al menos eventos importantes de:

```text
login/logout
usuarios
roles
empleados
recibos
visualizaciones/descargas
reemplazos
avisos
```

Nunca guardar:

```text
password
passwordHash
JWT
refresh token
signed URL
secret keys
contenido completo del recibo
```

---

# SEGURIDAD

Aplicar:

```text
Helmet
CORS restringido
validación de payloads
error handler central
rate limit de login
cookies seguras
mínimo privilegio
autorización por recurso
```

Casos críticos:

```text
Empleado A intenta abrir recibo B -> 403
Empleado cambia UUID -> 403
Usuario sin PAYSLIP_MANAGE pide upload intent -> 403
Usuario inactivo intenta acceder -> rechazar
Usuario sin ANNOUNCEMENT_MANAGE intenta editar -> 403
```

---

# INTEGRACIÓN FRONTEND-BACKEND

`frontend/` debe terminar como aplicación real, conservando la apariencia de `maqueta figma`.

Recordá que el frontend fue diseñado antes de cerrar el backend. Antes de conectar cada módulo, compará qué datos y acciones necesita realmente la pantalla con lo que ofrece la API. Si no coinciden, adaptá apropiadamente la capa backend/API o la capa de integración para que encajen, sin romper las reglas de dominio ni seguridad.

Conectar según permisos:

```text
login
sesión
usuario actual
dashboard
recibos
ver
descargar
avisos
no leídos
empleados
usuarios
roles
áreas
carga individual
carga masiva
gestión de avisos
```

Centralizar API, por ejemplo:

```text
frontend/src/api/
  httpClient.js
  auth.api.js
  employees.api.js
  payslips.api.js
  announcements.api.js
  users.api.js
```

Manejar consistentemente:

```text
401
403
400/422
500
refresh
logout
loading
errores
```

No guardar secretos en frontend.

---

# VARIABLES DE ENTORNO

No hardcodear secretos.

Backend puede requerir:

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN

SUPABASE_URL
SUPABASE_SECRET_KEY
SUPABASE_PAYSLIPS_BUCKET

JWT_ACCESS_SECRET
JWT_REFRESH_SECRET

FRONTEND_ORIGIN
NODE_ENV
```

Frontend sólo valores públicos:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_API_URL
```

Nunca:

```text
VITE_SUPABASE_SECRET_KEY
```

Crear/actualizar `.env.example` sin secretos reales.

---

# VERCEL

Frontend y backend se desplegarán separados.

Preparar Express para Vercel respetando la estructura actual.

No usar filesystem local persistente.

Recibos siempre en Supabase Storage.

Configurar correctamente CORS y env para:

```text
local
preview
production
```

No romper desarrollo local.

---

# TESTS Y VERIFICACIONES

No considerar terminado un módulo si no fue verificado.

Prioridad:

## Auth
```text
login válido
password inválida
usuario inactivo
refresh
revocación
logout
mustChangePassword
```

## RBAC
```text
permitido
denegado
múltiples roles
```

## Recibos
```text
empleado ve propios
empleado no ve ajenos
manager gestiona
upload intent
confirm
reemplazo
una sola versión ACTIVE
archive
view URL
download URL
```

## Avisos
```text
ALL
AREAS
usuario multi-área
vencidos
draft no visible
mark read
unread count
```

## Frontend
```text
build
rutas principales
formularios críticos
loading/error
rutas protegidas
JSX sin TS/TSX
```

---

# FORMA DE TRABAJO

Antes de escribir código:

```text
1. inspeccionar repositorio completo
2. leer package.json de backend y frontend
3. leer schema Drizzle
4. leer migraciones
5. leer storage.service.js
6. inspeccionar "maqueta figma"
7. inspeccionar frontend existente
8. detectar dependencias y convenciones
9. detectar inconsistencias
```

No duplicar soluciones existentes.

No reemplazar código funcional por preferencia personal.

Trabajar por módulos completos.

Orden recomendado:

```text
FASE 1
Inspección y diagnóstico

FASE 2
Backend base Express + middlewares + configuración

FASE 3
Auth + JWT + sesiones + RBAC + bootstrap ADMIN

FASE 4
Usuarios + empleados + áreas

FASE 5
Recibos individuales + Storage + versionado

FASE 6
Carga masiva

FASE 7
Avisos + áreas + leído/no leído

FASE 8
Transcripción de "maqueta figma" a frontend Vite React JSX

FASE 9
Integración frontend/backend

FASE 10
Tests + seguridad + build + Vercel + documentación
```

No avanzar dejando errores conocidos en una fase anterior.

---

# DEFINITION OF DONE

No considerar terminado hasta verificar:

```text
backend inicia
frontend inicia
frontend build pasa
tests backend pasan
verificaciones frontend pasan
migraciones consistentes
seed idempotente
sin secretos hardcodeados
"maqueta figma" intacta
frontend productivo en JSX
sin TS/TSX en frontend productivo
login real
RBAC real
empleado sólo accede a sus recibos
manager carga recibos
signed upload funciona
view privada funciona
download privada funciona
reemplazo/versionado funciona
carga múltiple funciona
avisos ALL/AREAS funcionan
leído/no leído funciona
auditoría funciona
configuración de Vercel documentada
```

---

# ENTREGA FINAL

Al finalizar:

- resumí qué implementaste;
- indicá decisiones técnicas nuevas;
- indicá archivos principales creados/modificados;
- indicá nuevas migraciones;
- indicá variables de entorno nuevas;
- indicá comandos exactos para instalar, ejecutar backend, ejecutar frontend, tests, build, migrar, seed y bootstrap ADMIN;
- informá cualquier pendiente;
- no afirmes que algo funciona si no fue verificado;
- no hagas commits con verificaciones fallando.

---

# PRIORIDAD

Esta aplicación maneja recibos de sueldo.

Ante conflicto entre comodidad y seguridad, priorizar:

```text
autorización
privacidad
integridad
trazabilidad
```

Sin sobreingeniería.

Es una V1 para un solo colegio.

NO agregar:

```text
multi-tenancy
microservicios
colas
event bus
WebSockets innecesarios
infraestructura no solicitada
```

---

# PRIMERA ACCIÓN DE CODEX

NO empieces escribiendo código.

Primero inspeccioná el repositorio y devolvé un diagnóstico breve con:

```text
- estructura encontrada
- estado actual del backend
- estado actual del frontend
- contenido/stack de "maqueta figma"
- piezas ya listas
- inconsistencias
- plan de implementación por fases
```

Después de ese diagnóstico, procedé con la implementación siguiendo este documento como fuente de verdad.
