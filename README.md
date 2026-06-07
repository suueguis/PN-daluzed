# Daluzed Inventario

Sistema de gestión de inventario para una empresa de repostería familiar.

## Arranque local

Backend:

```bash
python manage.py migrate
python manage.py runserver
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Producción

| Servicio | URL |
|----------|-----|
| Backend (Railway) | https://pn-daluzed-production.up.railway.app |
| Frontend (Vercel) | https://frontend-two-chi-31.vercel.app |
| Swagger | https://pn-daluzed-production.up.railway.app/api/docs/ |

> **Backups Railway**: Los backups automáticos de PostgreSQL requieren plan Pro.
> Con el plan gratuito/Hobby no están disponibles. Backup manual: exportar con `pg_dump` usando `DATABASE_PUBLIC_URL`.

## Datos de prueba

Para pruebas manuales y validación visual de endpoints, existe un comando que crea un usuario por cada rol del sistema:

```bash
python manage.py seed_demo_users
```

El comando es idempotente: si el usuario ya existe, lo actualiza y conserva una sola cuenta por rol.

Credenciales de prueba:

| Rol | Email | Password |
| --- | --- | --- |
| ADMIN | `admin.demo@daluzed.com` | `Daluzed2026!` |
| GERENTE | `gerente.demo@daluzed.com` | `Daluzed2026!` |
| PRODUCCION | `produccion.demo@daluzed.com` | `Daluzed2026!` |
| INVENTARIO | `inventario.demo@daluzed.com` | `Daluzed2026!` |

Para poblar la base de datos con datos de ejemplo que cubren todos los módulos (catálogo, bodegas con zonas, lotes activos, órdenes de compra en distintos estados, batidos de producción, lotes de producto terminado, alertas activas e historial de auditoría):

```bash
python manage.py seed_visual_data

# Borra datos previos y los recrea desde cero (no elimina usuarios)
python manage.py seed_visual_data --flush
```

Notas:

- Los usuarios se crean con el campo `role` del modelo `User`.
- No se asignan grupos de Django para que el JWT devuelva el mismo código de rol que usa el frontend.
- El usuario `ADMIN` queda marcado como `is_staff` y `is_superuser` para facilitar pruebas del panel de administración.

## Mantenimiento en producción

Si el superuser de Railway da 403 en endpoints de producción o batidos, ejecutar desde la consola de Railway:

```bash
python manage.py fix_superuser_roles
```

Esto actualiza todos los superusers cuyo `role` quedó como `INVENTARIO` (valor por defecto anterior) a `ADMIN`.
