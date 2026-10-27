# Despliegue en Vercel

Desplegar `backend/` y `frontend/` como proyectos separados. En backend configurar `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PAYSLIPS_BUCKET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CRON_SECRET`, `FRONTEND_ORIGIN` y `NODE_ENV=production`. En frontend configurar únicamente `VITE_API_URL` con la URL pública del backend.

El bucket `payslips` debe ser privado. No configurar claves de servicio de Supabase en el proyecto frontend. Luego de conocer la URL final del frontend, actualizar `FRONTEND_ORIGIN` del backend para que CORS y cookies funcionen entre ambos proyectos.

## Verificación previa al despliegue

Desde `backend/`, configurar las variables de `.env.example` y ejecutar:

```bash
pnpm install --frozen-lockfile
pnpm migrate
pnpm seed
pnpm test
pnpm e2e:auth
pnpm e2e:admin
pnpm e2e:payslips
pnpm e2e:bulk
pnpm e2e:announcements
pnpm start
```

El primer administrador se crea sólo desde un entorno controlado con
`pnpm bootstrap-admin`; las credenciales se suministran por variables de
entorno o argumentos y no se incorporan al repositorio.

Desde `frontend/`:

```bash
pnpm install --frozen-lockfile
pnpm build
```

En producción definir `NODE_ENV=production`, secretos JWT distintos y robustos,
un `FRONTEND_ORIGIN` explícito (admite una lista separada por comas), y conservar
`SUPABASE_SECRET_KEY` exclusivamente en el proyecto backend.

## Keep-alive de Supabase Free

El backend programa diariamente a las 12:00 UTC `GET /api/cron/supabase-keepalive`
mediante Vercel Cron. Vercel envía `Authorization: Bearer $CRON_SECRET`; definir
el mismo `CRON_SECRET` únicamente en las variables de entorno del proyecto backend.
La ruta actualiza `public.keepalive.id = 1` y no debe invocarse desde el frontend.

Generar el secreto de forma criptográficamente segura y cargar su salida como
variable de entorno, por ejemplo:

```bash
openssl rand -base64 32
```

No reutilizar este valor para JWT, Supabase ni ninguna otra credencial, y no lo
incluir en archivos versionados ni logs.

## Sesión entre proyectos separados

El frontend envía credenciales en las llamadas a la API y el backend restringe
CORS al valor exacto de `FRONTEND_ORIGIN`. En producción, la cookie HTTP-only
de refresh se emite con `Secure`, `SameSite=None` y `Partitioned` para permitir
la renovación de sesión cuando frontend y backend están en proyectos y dominios
de Vercel separados. En desarrollo conserva `SameSite=Lax` sin `Secure` para
seguir funcionando por HTTP local.

Configurar `FRONTEND_ORIGIN` con el origen HTTPS del frontend, sin path ni barra
final, y redesplegar el backend cada vez que cambie ese valor.
