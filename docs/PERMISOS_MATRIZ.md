# Matriz de Permisos — Daluzed Inventario

El sistema de permisos usa `role` como campo `CharField` en el modelo `User`.
No se usan grupos de Django para el RBAC.

Roles: **ADMIN**, **GERENTE**, **PRODUCCION**, **INVENTARIO**

Leyenda: ✅ permitido — ❌ denegado (responde 403)

---

## AUT — Autenticación

| Endpoint | ADMIN | GERENTE | PRODUCCION | INVENTARIO | Sin auth |
|----------|-------|---------|-----------|-----------|----------|
| `GET /auth/health/` | ✅ | ✅ | ✅ | ✅ | ✅ público |
| `POST /auth/login/` | ✅ | ✅ | ✅ | ✅ | ✅ público |
| `POST /auth/logout/` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /auth/token/refresh/` | ✅ | ✅ | ✅ | ✅ | ✅ (solo cookie) |
| `POST /auth/cambiar-contrasena/` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `GET /auth/usuarios/` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /auth/usuarios/` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `GET /auth/usuarios/{id}/` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `PUT/PATCH /auth/usuarios/{id}/` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /auth/usuarios/{id}/desactivar/` | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## CAT — Catálogo Maestro

| Endpoint | ADMIN | GERENTE | PRODUCCION | INVENTARIO |
|----------|-------|---------|-----------|-----------|
| `GET /catalogo/*` (leer) | ✅ | ✅ | ❌ | ✅ |
| `POST /catalogo/*` (crear) | ✅ | ❌ | ❌ | ✅ |
| `PUT/PATCH /catalogo/*` (editar) | ✅ | ❌ | ❌ | ✅ |
| `DELETE /catalogo/*` | ✅ | ❌ | ❌ | ✅ |
| `GET /catalogo/plantilla/` | ✅ | ❌ | ❌ | ✅ |
| `POST /catalogo/importar/` | ✅ | ❌ | ❌ | ✅ |
| `GET /catalogo/presentaciones/` | ✅ | ✅ | ❌ | ✅ |

> Constantes en código: `_CAT_READ = ('ADMIN', 'GERENTE', 'INVENTARIO')`, `_CAT_WRITE = ('ADMIN', 'INVENTARIO')`

---

## INV — Inventario

| Endpoint | ADMIN | GERENTE | PRODUCCION | INVENTARIO |
|----------|-------|---------|-----------|-----------|
| `GET /inventario/*` (leer) | ✅ | ✅ | ❌ | ✅ |
| `POST/PUT/PATCH /inventario/bodegas/` | ✅ | ❌ | ❌ | ✅ |
| `POST/PUT/PATCH /inventario/zonas/` | ✅ | ❌ | ❌ | ✅ |
| `GET /inventario/lotes/` | ✅ | ✅ | ❌ | ✅ |
| `GET /inventario/stock/` | ✅ | ✅ | ❌ | ✅ |
| `GET /inventario/stock-pdp/` | ✅ | ✅ | ❌ | ✅ |
| `GET /inventario/reorden/` | ✅ | ✅ | ❌ | ✅ |
| `GET /inventario/fefo/` | ✅ | ✅ | ❌ | ✅ |
| `GET /inventario/kardex/` | ✅ | ✅ | ❌ | ✅ |
| `GET /inventario/trazabilidad/{id}/` | ✅ | ✅ | ❌ | ✅ |
| `POST /inventario/traslados/` | ✅ | ❌ | ❌ | ✅ |
| `POST /inventario/devoluciones/` | ✅ | ❌ | ❌ | ✅ |
| `POST /inventario/descartes/` | ✅ | ❌ | ❌ | ✅ |

> Constantes en código: `_INV_READ = ('ADMIN', 'GERENTE', 'INVENTARIO')`, `_INV_WRITE = ('ADMIN', 'INVENTARIO')`

---

## REC — Recepción

| Endpoint | ADMIN | GERENTE | PRODUCCION | INVENTARIO |
|----------|-------|---------|-----------|-----------|
| `GET /recepcion/ordenes/` | ✅ | ✅ | ❌ | ✅ |
| `POST /recepcion/ordenes/` | ✅ | ❌ | ❌ | ✅ |
| `GET /recepcion/ordenes/{id}/` | ✅ | ✅ | ❌ | ✅ |
| `PUT/PATCH /recepcion/ordenes/{id}/` | ✅ | ❌ | ❌ | ✅ |
| `GET /recepcion/` (listar recepciones) | ✅ | ✅ | ❌ | ✅ |
| `POST /recepcion/` (crear recepción) | ✅ | ❌ | ❌ | ✅ |
| `GET /recepcion/{id}/` | ✅ | ✅ | ❌ | ✅ |
| `GET /recepcion/{id}/pdf/` | ✅ | ✅ | ❌ | ✅ |

> Constantes en código: `_REC_READ = ('ADMIN', 'GERENTE', 'INVENTARIO')`, `_REC_WRITE = ('ADMIN', 'INVENTARIO')`

---

## PROD — Producción

| Endpoint | ADMIN | GERENTE | PRODUCCION | INVENTARIO |
|----------|-------|---------|-----------|-----------|
| `GET /produccion/batidos/` | ✅ | ✅ | ✅ | ❌ |
| `POST /produccion/batidos/` | ✅ | ❌ | ✅ | ❌ |
| `GET /produccion/batidos/{id}/` | ✅ | ✅ | ✅ | ❌ |
| `PUT/PATCH /produccion/batidos/{id}/` | ✅ | ❌ | ✅ | ❌ |
| `GET /produccion/despachos/` | ✅ | ✅ | ✅ | ❌ |
| `POST /produccion/despachos/` | ✅ | ❌ | ✅ | ❌ |
| `POST /produccion/despachos/{id}/despachar/` | ✅ | ❌ | ✅ | ❌ |
| `GET /produccion/compensatorios/` | ✅ | ✅ | ✅ | ❌ |
| `POST /produccion/compensatorios/` | ✅ | ❌ | ✅ | ❌ |
| `GET /produccion/sugerencia-fefo/` | ✅ | ✅ | ✅ | ❌ |
| `GET /produccion/sugerencia-fifo/` | ✅ | ✅ | ✅ | ❌ |
| `GET /produccion/jornadas/` | ✅ | ✅ | ✅ | ❌ |

> Constantes en código: `_PROD_READ = ('ADMIN', 'GERENTE', 'PRODUCCION')`, `_PROD_WRITE = ('ADMIN', 'PRODUCCION')`

---

## ALR — Alertas

| Endpoint | ADMIN | GERENTE | PRODUCCION | INVENTARIO |
|----------|-------|---------|-----------|-----------|
| `GET /alertas/activas/` | ✅ | ✅ | ✅ | ✅ |
| `GET /alertas/reorden/` | ✅ | ✅ | ✅ | ✅ |
| `GET /alertas/vencimiento/` | ✅ | ✅ | ✅ | ✅ |
| `GET /alertas/produccion-vencida/` | ✅ | ✅ | ✅ | ✅ |
| `POST /alertas/{id}/resolver/` | ✅ | ❌ | ✅ | ✅ |
| `GET /alertas/configuracion/` | ✅ | ❌ | ❌ | ❌ |
| `PUT/PATCH /alertas/configuracion/` | ✅ | ❌ | ❌ | ❌ |

> Constantes en código: `_ALR_READ = ('ADMIN', 'GERENTE', 'PRODUCCION', 'INVENTARIO')`, `_ALR_WRITE = ('ADMIN', 'INVENTARIO', 'PRODUCCION')`

---

## IND — Indicadores

Todos los endpoints usan `IsAuthenticated` — cualquier rol autenticado puede acceder.

| Endpoint | ADMIN | GERENTE | PRODUCCION | INVENTARIO |
|----------|-------|---------|-----------|-----------|
| `GET /indicadores/kpis/` | ✅ | ✅ | ✅ | ✅ |
| `GET /indicadores/utilizacion-bodega/` | ✅ | ✅ | ✅ | ✅ |
| `GET /indicadores/reporte-semanal/` | ✅ | ✅ | ✅ | ✅ |
| `GET /indicadores/resumen/` | ✅ | ✅ | ✅ | ✅ |
| `GET /indicadores/exportar/` | ✅ | ✅ | ✅ | ✅ |

---

## AUD — Auditoría

| Endpoint | ADMIN | GERENTE | PRODUCCION | INVENTARIO |
|----------|-------|---------|-----------|-----------|
| `GET /auditoria/bitacora/` | ✅ | ❌ | ❌ | ❌ |

---

## Resumen ejecutivo

| Módulo | ADMIN | GERENTE | PRODUCCION | INVENTARIO |
|--------|-------|---------|-----------|-----------|
| AUT — gestión de usuarios | R/W | — | — | — |
| CAT — catálogo | R/W | R | — | R/W |
| INV — inventario | R/W | R | — | R/W |
| REC — recepción | R/W | R | — | R/W |
| PROD — producción | R/W | R | R/W | — |
| ALR — alertas | R/W/Config | R | R/W | R/W |
| IND — indicadores | R | R | R | R |
| AUD — bitácora | R | — | — | — |

---

## Implementación interna

Las factories en `apps/authentication/permissions.py`:

```python
allow_roles('ADMIN', 'GERENTE')           # solo lectura típico
allow_roles_rw(read=(...), write=(...))   # lectura y escritura con distintos roles
```

Los superusers (`is_superuser=True`) **no tienen bypass automático** — deben tener `role='ADMIN'`.
Si un superuser da 403: `python manage.py fix_superuser_roles`.
