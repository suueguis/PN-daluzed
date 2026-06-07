# API Reference — Daluzed Inventario

Base URL: `https://pn-daluzed-production.up.railway.app/api/v1/`

Todos los endpoints requieren `Authorization: Bearer <access_token>` salvo los marcados como público.
El token se obtiene en `POST /auth/login/` y tiene vida útil de 30 minutos.

---

## AUT — Autenticación `/api/v1/auth/`

| Método | Ruta | Descripción | Acceso |
|--------|------|-------------|--------|
| GET | `health/` | Health check del servidor | Público |
| POST | `login/` | Autenticar usuario, devuelve access token + cookie refresh | Público |
| POST | `logout/` | Invalida refresh token (blacklist) + limpia cookie | Autenticado |
| POST | `token/refresh/` | Renueva access token usando cookie HttpOnly | Cookie válida |
| POST | `cambiar-contrasena/` | Cambiar contraseña del usuario autenticado | Autenticado |
| GET | `usuarios/` | Listar usuarios | ADMIN |
| POST | `usuarios/` | Crear usuario | ADMIN |
| GET | `usuarios/{id}/` | Detalle de usuario | ADMIN |
| PUT/PATCH | `usuarios/{id}/` | Actualizar usuario | ADMIN |
| POST | `usuarios/{id}/desactivar/` | Desactivar usuario (no elimina) | ADMIN |

### POST `/auth/login/`
```json
// Request
{ "email": "admin@daluzed.com", "password": "pass" }

// Response 200
{
  "access": "<JWT>",
  "user": { "id": 1, "email": "admin@daluzed.com", "role": "ADMIN", "username": "admin@daluzed.com" }
}
// Cookie HttpOnly: refresh=<token>; SameSite=None; Secure (prod) / SameSite=Lax (dev)
```
Errores: 400 (credenciales inválidas, incluye intentos restantes), 423 (cuenta bloqueada por Axes).

### POST `/auth/token/refresh/`
Usa la cookie `refresh` automáticamente. No requiere body. Devuelve nuevo `access` token.
Cada refresh invalida el anterior (`ROTATE_REFRESH_TOKENS=True`).

---

## CAT — Catálogo Maestro `/api/v1/catalogo/`

Lectura: ADMIN, GERENTE, INVENTARIO — Escritura: ADMIN, INVENTARIO

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `unidades-medida/` | CRUD unidades de medida |
| GET/PUT/PATCH/DELETE | `unidades-medida/{id}/` | Detalle unidad |
| GET/POST | `proveedores/` | CRUD proveedores |
| GET/PUT/PATCH/DELETE | `proveedores/{id}/` | Detalle proveedor |
| GET/POST | `materias-primas/` | CRUD materias primas |
| GET/PUT/PATCH/DELETE | `materias-primas/{id}/` | Detalle materia prima |
| GET/POST | `productos-terminados/` | CRUD productos terminados |
| GET/PUT/PATCH/DELETE | `productos-terminados/{id}/` | Detalle producto terminado |
| GET | `presentaciones/` | Listar presentaciones (solo lectura) |
| GET | `presentaciones/{id}/` | Detalle presentación |
| GET | `plantilla/` | Descargar plantilla Excel para importación | ADMIN, INVENTARIO |
| POST | `importar/` | Importar catálogo desde Excel | ADMIN, INVENTARIO |

---

## INV — Inventario `/api/v1/inventario/`

Lectura: ADMIN, GERENTE, INVENTARIO — Escritura: ADMIN, INVENTARIO

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `bodegas/` | CRUD bodegas (tipos: PRINCIPAL, PDP) |
| GET/PUT/PATCH/DELETE | `bodegas/{id}/` | Detalle bodega |
| GET/POST | `zonas/` | CRUD zonas de bodega |
| GET/PUT/PATCH/DELETE | `zonas/{id}/` | Detalle zona |
| GET | `lotes/` | Listar lotes activos |
| GET | `stock/` | Stock agregado por materia prima |
| GET | `stock-pdp/` | Stock en bodega PDP (Punto de Producción) |
| GET | `reorden/` | Materias primas bajo punto de reorden |
| GET | `fefo/` | Sugerencia FEFO (First Expired, First Out) |
| GET/POST | `traslados/` | CRUD traslados entre bodegas |
| GET/PUT/PATCH | `traslados/{id}/` | Detalle traslado |
| POST | `devoluciones/` | Devolver lote a proveedor |
| POST | `descartes/` | Descartar lote por merma o vencimiento |
| GET | `trazabilidad/{lote_id}/` | Historial de movimientos de un lote |
| GET | `kardex/` | Kardex filtrable por materia prima y rango de fechas |

### GET `/inventario/stock/`
```json
[
  {
    "materia_prima_id": 1,
    "nombre": "Harina",
    "total": "250.00",
    "unidad": "kg",
    "punto_reorden": "50.00",
    "bajo_reorden": false
  }
]
```

### POST `/inventario/traslados/`
```json
{ "lote": 5, "bodega_destino": 2, "cantidad": "10.00", "notas": "traslado a PDP" }
```
Tipos de movimiento: `ENTRADA`, `SALIDA`, `TRASLADO`, `DEVOLUCION`, `DESCARTE`.

---

## REC — Recepción `/api/v1/recepcion/`

Lectura: ADMIN, GERENTE, INVENTARIO — Escritura: ADMIN, INVENTARIO

### Órdenes de Compra

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `ordenes/` | Listar / crear órdenes de compra |
| GET/PUT/PATCH/DELETE | `ordenes/{id}/` | Detalle orden |

Estados de OC: `PENDIENTE` → `PARCIAL` → `RECIBIDA` / `CANCELADA`

### Recepciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `` (raíz) | Listar / crear recepciones de mercancía |
| GET | `{id}/` | Detalle recepción |
| GET | `{id}/pdf/` | Descargar PDF de la recepción |

### POST `recepcion/` (crear recepción)
Crea una `RecepcionMercancia` vinculada a una `OrdenCompra`. Por cada ítem de la OC se crea un `Lote` en `Inventario`.
Si `dias_restantes < dias_minimos_vencimiento` y no hay `justificacion_vencimiento`, lanza error 400 (`VidaUtilInsuficienteError`).
Soporta recepciones parciales — la OC queda en estado `PARCIAL` hasta recibir todo.

---

## PROD — Producción `/api/v1/produccion/`

Lectura: ADMIN, GERENTE, PRODUCCION — Escritura: ADMIN, PRODUCCION

### Batidos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `batidos/` | Listar / crear batidos |
| GET/PUT/PATCH | `batidos/{id}/` | Detalle batido |

Estados de Batido: `EN_PROCESO` → `COMPLETADO` / `CANCELADO`
Regla: máximo 2 batidos `EN_PROCESO` simultáneos.
Ingredientes se consumen de `Bodega PDP` aplicando FEFO.

### Despachos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `despachos/` | Listar / crear despachos |
| POST | `despachos/{id}/despachar/` | Marcar lote PT como EN_PUNTO_DE_VENTA |

Despacho aplica FIFO sobre `LoteProductoTerminado` (ordena por `fecha_produccion` asc).
Transición de estado: `EN_ESPERA` → `EN_PUNTO_DE_VENTA`.

### Compensatorios

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `compensatorios/` | Listar / crear movimientos compensatorios |
| GET | `compensatorios/{id}/` | Detalle compensatorio |

Registro inmutable de correcciones a datos previos (RF-PROD-08). Solo crear y consultar.

### Endpoints auxiliares

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `sugerencia-fefo/` | Sugerencia FEFO de ingredientes desde Bodega PDP |
| GET | `sugerencia-fifo/` | Sugerencia FIFO de lotes de PT para despacho |
| GET | `jornadas/` | Resumen de la jornada activa (batidos EN_PROCESO) |

---

## ALR — Alertas `/api/v1/alertas/`

Lectura: todos los roles — Escritura: ADMIN, INVENTARIO, PRODUCCION — Configuración: solo ADMIN

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `activas/` | Alertas activas (todos los tipos) |
| GET | `reorden/` | Alertas de stock bajo punto de reorden |
| GET | `vencimiento/` | Alertas de vencimiento próximo |
| GET | `produccion-vencida/` | Alertas de lotes PT pendientes de despacho |
| POST | `{id}/resolver/` | Resolver/cerrar una alerta | ADMIN, INVENTARIO, PRODUCCION |
| GET/PUT/PATCH | `configuracion/` | Ver / actualizar configuración de umbrales | ADMIN |

Tipos de alerta: `STOCK_BAJO`, `VENCIMIENTO_PROXIMO`, `EN_ESPERA_PENDIENTE`.
Las alertas se generan automáticamente vía señal `post_save` en `Lote`.

---

## IND — Indicadores `/api/v1/indicadores/`

Todos los roles autenticados pueden acceder.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `kpis/` | KPIs principales (stock, alertas, producción) |
| GET | `utilizacion-bodega/` | % de ocupación de cada bodega |
| GET | `reporte-semanal/` | Resumen de actividad de los últimos 7 días |
| GET | `resumen/` | Datos condensados para el Dashboard |
| GET | `exportar/` | Exportar reporte en PDF o XLSX (param: `formato=pdf|xlsx`) |

### GET `/indicadores/kpis/`
```json
{
  "total_materias_primas": 12,
  "alertas_activas": 3,
  "batidos_en_proceso": 1,
  "lotes_por_vencer": 2,
  "ordenes_pendientes": 1
}
```

---

## AUD — Auditoría `/api/v1/auditoria/`

Solo ADMIN.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `bitacora/` | Historial de operaciones críticas con filtros opcionales |

Filtros disponibles: `?accion=LOGIN&usuario_id=1&desde=2026-01-01&hasta=2026-12-31`

Operaciones registradas: `LOGIN`, `LOGOUT`, `RECEPCION_CREADA`, `TRASLADO`, `BATIDO_CREADO`, `COMPENSATORIO`, `DESPACHO`, `USUARIO_DESACTIVADO`.

---

## Swagger interactivo

- Schema YAML: `GET /api/schema/`
- Swagger UI: `GET /api/docs/`
