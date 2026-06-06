# Backup y restauración de base de datos — Daluzed

## Estrategia

- **Proveedor:** Railway (PostgreSQL 15 managed)
- **Frecuencia:** diaria automática
- **Retención:** 7 días
- **Activación:** manual vía Railway Dashboard (ver sección "Setup en Railway")

---

## Setup en Railway (acción manual única)

1. Abrir el proyecto en [railway.app](https://railway.app/)
2. Seleccionar el servicio **PostgreSQL**.
3. Ir a la pestaña **Backups**.
4. Activar **Automatic Backups** → frecuencia `Daily`, retención `7 days`.
5. Guardar. Railway comenzará a crear snapshots diarios a las 00:00 UTC.

> Railway Pro/Team plan incluye backups automáticos. En plan Hobby, los backups
> son manuales — generar uno antes de cada deploy importante.

---

## Crear backup manual

```bash
# Desde la Railway CLI
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

O desde el Dashboard: **PostgreSQL → Backups → Create Backup**.

---

## Restaurar desde un backup

### Opción A — Railway Dashboard

1. **PostgreSQL → Backups** → seleccionar el snapshot deseado.
2. Click **Restore** → confirmar. Railway restaura en un nuevo branch de la BD.
3. Verificar datos, luego apuntar `DATABASE_URL` al branch restaurado si corresponde.

### Opción B — pg_restore manual

```bash
# 1. Descargar el backup (.sql o .dump) desde Railway Dashboard.

# 2. Restaurar en una BD local o en el servicio PostgreSQL de Railway:
psql $DATABASE_URL < backup_20260605.sql

# Para formato custom (.dump):
pg_restore --clean --no-acl --no-owner -d $DATABASE_URL backup_20260605.dump
```

### Consideraciones antes de restaurar

- **Avisa al equipo** antes de restaurar en producción — todos los cambios
  posteriores al snapshot se perderán.
- Respalda el estado actual antes de restaurar:
  ```bash
  railway run pg_dump $DATABASE_URL > pre_restore_$(date +%Y%m%d_%H%M).sql
  ```
- Después de restaurar, reinicia el servicio Django para limpiar caché de ORM:
  ```bash
  railway service restart
  ```

---

## Verificar integridad de un backup

```bash
# Restaurar en una BD temporal
psql postgres://localhost/daluzed_test < backup_20260605.sql

# Correr migraciones para confirmar compatibilidad
DATABASE_URL=postgres://localhost/daluzed_test python manage.py migrate --check

# Correr tests contra la BD restaurada
DATABASE_URL=postgres://localhost/daluzed_test python manage.py test apps --verbosity=1
```

---

## Monitoreo

- Railway envía alertas por email si un backup programado falla.
- Revisar el estado de backups en **Railway Dashboard → PostgreSQL → Backups**
  al menos una vez por semana.
