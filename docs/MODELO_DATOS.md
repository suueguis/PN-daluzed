# Modelo de Datos — Daluzed Inventario

Base de datos: PostgreSQL 15. ORM: Django 4.2. Todos los campos usan nombres en español.

---

## Módulo AUT — `apps.authentication`

### `User` (extiende `AbstractUser`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `email` | EmailField unique | `USERNAME_FIELD` — se usa en lugar de `username` |
| `role` | CharField(20) | `ADMIN` / `GERENTE` / `PRODUCCION` / `INVENTARIO` (default: `INVENTARIO`) |
| `is_staff` | bool | Solo ADMIN demo tiene `is_staff=True` |
| `is_superuser` | bool | `create_superuser` fuerza `role='ADMIN'` automáticamente |
| `is_active` | bool | Se desactiva en lugar de eliminar |
| `date_joined` | DateTimeField | auto |

`username` está explícitamente eliminado (`username = None`).

---

## Módulo CAT — `apps.catalogo`

### `UnidadMedida`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `nombre` | CharField(50) unique | ej. "Kilogramo" |
| `simbolo` | CharField(10) unique | ej. "kg" |
| `activo` | bool | default True |

### `Proveedor`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `nombre` | CharField(200) unique | |
| `contacto` | CharField(200) | opcional |
| `telefono` | CharField(20) | opcional |
| `email` | EmailField | opcional |
| `activo` | bool | default True |

### `MateriaPrima`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `nombre` | CharField(200) unique | |
| `unidad_medida` | FK → UnidadMedida | PROTECT |
| `punto_reorden` | Decimal(12,2) | Umbral para alerta STOCK_BAJO (solo aplica a Bodega Principal) |
| `dias_minimos_vencimiento` | PositiveInt nullable | Si está definido, bloquea recepciones con menos días |
| `categoria` | CharField | Campo de texto libre |
| `condicion_almacenamiento` | CharField | Campo de texto libre |
| `activo` | bool | default True |
| `proveedores` | M2M → Proveedor | Proveedores habituales |

### `ProductoTerminado`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `codigo` | CharField(20) unique | Auto-generado si se deja vacío |
| `nombre` | CharField(200) unique | |
| `vida_util_dias` | PositiveInt | Días desde producción hasta vencimiento |
| `unidad_medida` | FK → UnidadMedida | PROTECT |
| `activo` | bool | default True |

### `Presentacion`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `nombre` | CharField(100) | |
| `materia_prima` | FK → MateriaPrima | PROTECT |
| `unidad_medida` | FK → UnidadMedida | PROTECT |
| `factor_conversion` | Decimal(14,4) | Unidades del empaque en unidad base |
| `costo` | Decimal(12,2) nullable | Precio de compra por presentación |
| `activo` | bool | default True |
| Meta unique_together | (`materia_prima`, `nombre`) | |

---

## Módulo INV — `apps.inventario`

### `Bodega`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `nombre` | CharField(100) unique | |
| `tipo` | CharField(10) | `PRINCIPAL` o `PDP` (Punto de Producción) |

### `ZonaBodega`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `bodega` | FK → Bodega | CASCADE |
| `nombre` | CharField(100) | |
| `descripcion` | TextField | opcional |
| `capacidad_maxima` | Decimal | opcional |
| Meta unique_together | (`bodega`, `nombre`) | |

### `Lote`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `materia_prima` | FK → MateriaPrima | PROTECT |
| `bodega` | FK → Bodega | PROTECT |
| `zona` | FK → ZonaBodega nullable | SET_NULL |
| `proveedor` | FK → Proveedor nullable | SET_NULL |
| `cantidad` | Decimal(12,2) | Cantidad actual en stock |
| `fecha_vencimiento` | DateField | |
| `fecha_entrada` | DateField | default `today` |
| `numero_lote` | CharField(50) | Opcional, del proveedor |

Señal `post_save` dispara `AlertaService` automáticamente al guardar un lote.

### `MovimientoInventario`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `tipo` | CharField(15) | `ENTRADA` / `SALIDA` / `TRASLADO` / `DEVOLUCION` / `DESCARTE` |
| `lote` | FK → Lote | PROTECT |
| `bodega_origen` | FK → Bodega nullable | SET_NULL |
| `bodega_destino` | FK → Bodega nullable | SET_NULL |
| `cantidad` | Decimal(12,2) | |
| `usuario` | FK → User | SET_NULL nullable |
| `fecha` | DateTimeField | auto_now_add |
| `notas` | TextField | opcional |

---

## Módulo REC — `apps.recepcion`

### `OrdenCompra`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `proveedor` | FK → Proveedor | PROTECT |
| `fecha_creacion` | DateField | default `today` |
| `estado` | CharField(10) | `PENDIENTE` → `PARCIAL` → `RECIBIDA` / `CANCELADA` |
| `usuario_creador` | FK → User nullable | SET_NULL |

### `DetalleOrdenCompra`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `orden` | FK → OrdenCompra | CASCADE |
| `materia_prima` | FK → MateriaPrima | PROTECT |
| `presentacion` | FK → Presentacion | PROTECT |
| `cantidad_presentacion` | Decimal(10,2) | Cantidad de presentaciones pedidas |
| `cantidad_recibida` | Decimal(10,2) | Acumulado de lo recibido (default 0) |

### `RecepcionMercancia`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `orden_compra` | FK → OrdenCompra | PROTECT |
| `fecha` | DateField | default `today` |
| `usuario` | FK → User nullable | SET_NULL |
| `confirmada` | bool | default True |
| `justificacion_vencimiento` | TextField | Requerida si `dias_restantes < dias_minimos_vencimiento` |

La recepción crea `Lote` e incrementa `cantidad_recibida` en `DetalleOrdenCompra`.
Si todos los ítems están completos → OC pasa a `RECIBIDA`; si parcial → `PARCIAL`.

---

## Módulo PROD — `apps.produccion`

### `Batido`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `producto_terminado` | FK → ProductoTerminado | PROTECT |
| `fecha_produccion` | DateField | default `today` |
| `hora_inicio` | TimeField | |
| `estado` | CharField(15) | `EN_PROCESO` / `COMPLETADO` / `CANCELADO` |
| `usuario` | FK → User nullable | SET_NULL |
| `fecha_registro` | DateTimeField | auto_now_add |
| Meta ordering | `['-fecha_produccion', 'hora_inicio']` | |

Regla: máximo 2 batidos en estado `EN_PROCESO` simultáneamente.

### `DetalleBatido`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `batido` | FK → Batido | CASCADE |
| `materia_prima` | FK → MateriaPrima | PROTECT |
| `lote` | FK → Lote | PROTECT — registra exactamente qué lote se consumió (FEFO) |
| `cantidad` | Decimal(12,2) | |

### `LoteProductoTerminado`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `batido` | FK → Batido | CASCADE |
| `estado` | CharField(20) | `EN_ESPERA` → `EN_PUNTO_DE_VENTA` |
| `cantidad` | Decimal(12,2) | |
| `fecha_produccion` | DateField | |
| `fecha_vencimiento` | DateField | `fecha_produccion + vida_util_dias` |
| `fecha_despacho` | DateField nullable | Se registra al despachar |
| Meta ordering | `['fecha_produccion']` | Garantiza FIFO para despacho |

### `MovimientoCompensatorio`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `tipo_afectado` | CharField(50) | Nombre del modelo corregido |
| `id_afectado` | PositiveInt | PK del registro corregido |
| `datos_originales` | JSONField | Estado previo al ajuste |
| `datos_corregidos` | JSONField | Estado nuevo |
| `descripcion` | TextField | Motivo del ajuste |
| `usuario` | FK → User nullable | SET_NULL |
| `fecha` | DateTimeField | auto_now_add |

Registro inmutable — no se permite editar ni eliminar.

---

## Módulo ALR — `apps.alertas`

### `ConfiguracionAlerta` (singleton)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | Solo existe 1 registro |
| `whatsapp_numero` | CharField(20) | Con código de país, ej. +573001234567 |
| `email_gerencia` | EmailField | |
| `email_produccion` | EmailField | |
| `dias_umbral_vencimiento` | PositiveInt | default 7 — días antes del vencimiento para alertar |

### `Alerta`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `tipo` | CharField(25) | `STOCK_BAJO` / `VENCIMIENTO_PROXIMO` / `EN_ESPERA_PENDIENTE` |
| `materia_prima` | FK → MateriaPrima nullable | SET_NULL |
| `bodega` | FK → Bodega nullable | SET_NULL |
| `lote` | FK → Lote nullable | SET_NULL |
| `activa` | bool | default True — False cuando se resuelve |
| `mensaje` | TextField | Descripción legible |
| `fecha_creacion` | DateTimeField | auto_now_add |
| `fecha_resolucion` | DateTimeField nullable | Se registra al resolver |
| Meta ordering | `['-fecha_creacion']` | |

---

## Módulo AUD — `apps.auditoria`

### `BitacoraOperacion`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | PK auto | |
| `usuario` | FK → User nullable | SET_NULL — queda registro aunque se borre el user |
| `accion` | CharField(50) | Ver tabla de acciones abajo |
| `detalle` | JSONField | Datos específicos de la operación |
| `ip` | GenericIPAddressField nullable | IP del cliente |
| `fecha` | DateTimeField | auto_now_add |

Acciones registradas: `LOGIN`, `LOGOUT`, `RECEPCION_CREADA`, `TRASLADO`, `BATIDO_CREADO`, `COMPENSATORIO`, `DESPACHO`, `USUARIO_DESACTIVADO`.

---

## Diagrama de relaciones (texto)

```
User ─────────────────────────────────────────────┐
                                                   │ (creador/usuario en tablas de operación)
UnidadMedida ◄── MateriaPrima ◄── Presentacion    │
                    │    │                         │
                    │    └─── M2M ── Proveedor ◄──┼─ OrdenCompra ◄── DetalleOrdenCompra
                    │                             │        │
                    ▼                             │        ▼
                  Lote ◄─────────────────────────┘  RecepcionMercancia
                  (bodega FK)
                  │    │
               Bodega  ZonaBodega
                  │
                  └─► MovimientoInventario
                  └─► DetalleBatido ◄── Batido ──► LoteProductoTerminado
                  └─► Alerta                    └─► MovimientoCompensatorio

ConfiguracionAlerta (singleton, sin FK externas)
BitacoraOperacion ──► User
ProductoTerminado ◄── Batido
```

---

## Convenciones de nomenclatura

- Nombres de campos en **español** (dominio del negocio)
- Claves foráneas usan `on_delete=PROTECT` para datos críticos (MateriaPrima, Lote, Proveedor)
- `on_delete=SET_NULL` para referencias de usuario y auditoria (no bloquear borrado de cuentas)
- `on_delete=CASCADE` solo cuando los hijos no tienen sentido sin el padre (ZonaBodega → Bodega, DetalleBatido → Batido)
- Campos de estado siempre como `CharField` con `choices` — no se usan enums de Python
