# Despliegue en Vercel

Desplegar `backend/` y `frontend/` como proyectos separados. En backend configurar `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PAYSLIPS_BUCKET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_ORIGIN` y `NODE_ENV=production`. En frontend configurar únicamente `VITE_API_URL` con la URL pública del backend.

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
