# Checklist de pendientes — Daluzed

> **Actualizado:** Junio 2026  
> **Leyenda de tamaño:** 🟢 pequeño (< 2h) · 🟡 mediano (2–6h) · 🔴 grande (> 6h)  
> **Leyenda de prioridad:** `+I` = +Importante (próxima iteración) · `M` = Must Have · `S` = Should Have · `+` = más allá de requisitos

Marcar con `[x]` a medida que se completen.

---

## 0. +Importante — bugs UX/seguridad detectados en `main` (2026-06-04)

Hallazgos sobre la app desplegada en `main` (último commit: `ff23c1c` — responsive). Tienen prioridad sobre el resto del backlog hasta dejarlos en cero.

### 0.1 Inputs sin `placeholder` (UX) 🟢

Los formularios muestran campos vacíos sin texto guía. Usuarios nuevos no saben qué tipear.

- [x] Auditar **todos** los `<input>`, `<textarea>` y `<select>` del frontend y añadir `placeholder` significativo (ej.: "ej. 250.00", "kg", "Selecciona una bodega"). _(PR #34; pendientes archivos bloqueados Dashboard/Perfil/BodegasPage/MateriasPrimasPage — entran con sus PRs respectivos)_
- [x] Caso especial: el `<input type="password">` puede usar `placeholder="••••••••"`. _(ya existía en Login)_
- [x] Verificar contraste del placeholder (no debe parecer un valor real ya escrito). _(Input/Select usan `placeholder:text-wine-700/40`)_

---

### 0.2 Confirmación doble en acciones destructivas (UX/Seguridad) 🟢

Hoy las acciones peligrosas (logout, desactivar usuario, descartar lote, anular OC, eliminar bodega/zona) se ejecutan con un solo click sin diálogo de "¿estás seguro?".

- [x] Crear un componente `<ConfirmDialog>` reutilizable que pida confirmación con dos pasos cuando la acción es **irreversible** o afecta a otros usuarios. _(PR #35)_
  - Primer paso: modal con descripción del impacto.
  - Segundo paso: usuario debe escribir la palabra clave (ej.: el email del usuario a desactivar, el código del lote a descartar).
- [x] Aplicar a: Descartar lote, Eliminar bodega/zona. _(PR #35)_ Cerrar sesión (Perfil) y Desactivar usuario quedan en cola: `Perfil.jsx` bloqueado por PR #28/#29, y 1.1 (gestión de usuarios) aún no implementado. Anular OC no tiene flujo todavía.
- [x] Tests: garantizar que el segundo click no avance hasta que se cumpla la condición. _(4 tests en `ConfirmDialog.test.jsx`)_

---

### 0.3 Toasts/errores con descripción concreta (UX) 🟢

Hoy aparecen toasts genéricos tipo "Error" o "Algo salió mal". El usuario no sabe qué pasó ni qué hacer.

- [x] Crear helper `formatApiError(error)` que extraiga: campo afectado, mensaje del backend, código HTTP y sugerencia. _(PR #36 — `frontend/src/utils/formatApiError.js`)_
- [x] Aplicar en **todos** los catch de `useMutation`/`try-catch` del frontend. _(PR #36 — sweep en alertas, recepcion, inventario, produccion y catalogo. Quedan `MateriasPrimasPage` y `Perfil` bloqueados por PR #27/#28/#29 — entran cuando esos PRs mergeen.)_
- [x] Ejemplo: en vez de "Error al crear materia prima" → "No se pudo crear: 'código' ya está en uso. Usa uno distinto." _(formatApiError emite "codigo: Ya existe" cuando DRF responde `{ codigo: ['Ya existe.'] }`)_
- [x] Tests por página crítica (Login, NuevaRecepción, NuevoBatido, Compensatorios). _(10 tests del helper en `formatApiError.test.js` cubren los códigos 400/401/403/404/500/red caída y los formatos de respuesta DRF que usan esas páginas)_

---

### 0.4 Eliminar `console.log` que exponen `username`/datos sensibles (Seguridad) 🟢

En DevTools se ven prints con el email del usuario logueado. Riesgo de leak en sesiones compartidas/grabaciones de pantalla.

- [x] `grep -rn "console\." frontend/src` y revisar cada uno. Eliminar todos los que loguen objetos de usuario, tokens o respuestas del API. _(0 hallazgos al cierre del item — PR #31)_
- [x] Mantener sólo `console.error` controlados en interceptores y limpiar el payload antes de loguear. _(interceptor de `axiosClient` no loguea)_
- [x] Añadir regla de ESLint `no-console: ['error', { allow: ['warn', 'error'] }]` para evitar regresiones. _(PR #31)_
- [x] Verificar que en `build` de producción no haya rastros.

---

### 0.5 Reemplazar el campo que pide datos en JSON crudo (UX crítico) 🟡

Algún formulario está pidiendo que el usuario tipee JSON directamente — un usuario de panadería no tiene por qué saber JSON.

- [x] Localizar el(los) formulario(s): probablemente en módulos de configuración, alertas o detalle de movimientos. _(Hallado: `CompensatoriosPage` — `datos_originales` y `datos_corregidos` JSONField)_
- [x] Reemplazar por un formulario con campos individuales tipados (selects, inputs numéricos, datepickers). _(Nuevo `KeyValueEditor` con coerción numérica/booleana — PR #33; textareas JSON permanecen como fallback editable)_
- [x] Si el backend usa `JSONField`, validar/serializar la entrada estructurada antes de enviarla. _(`KeyValueEditor.onChange` construye el objeto y lo serializa antes de POST)_

---

### 0.6 Proveedores: respetar `activo` en flujo de Orden de Compra (Bug funcional) 🟡

Al crear una OC, el dropdown de proveedores incluye proveedores **inactivos** (o, peor: los inactivos también pueden seleccionarse y la OC se crea).

- [x] Backend: `ProveedorViewSet.get_queryset` acepta `?activo=true/false` y filtra correctamente. Tests CAT-014b/c añadidos. _(desbloqueado en este PR)_
- [x] Frontend (`NuevaOrdenPage`): consumir solo proveedores activos en el selector de OC. _(PR #32)_
- [x] Validación de servidor: si llega `proveedor_id` inactivo en el POST, devolver `400` con mensaje claro. _(`OrdenCompraSerializer.validate_proveedor` → PR #32)_
- [x] Test backend: crear OC con proveedor inactivo → debe fallar. _(PR #32)_
- [x] Test frontend: el selector no lista inactivos. _(PR #32)_

---

## 1. Must Have — lo que falta y es obligatorio

### 1.1 Gestión de usuarios (RF-AUT-04) 🔴

El modelo `User` existe, pero no hay endpoints CRUD ni UI. El Admin no puede crear ni desactivar usuarios desde el sistema.

- [x] **Backend:** crear `UserViewSet` en `apps/authentication/api/v1/views.py`
  - `GET /api/v1/auth/usuarios/` — listar usuarios (solo ADMIN)
  - `POST /api/v1/auth/usuarios/` — crear usuario con rol
  - `PATCH /api/v1/auth/usuarios/{id}/` — editar rol o datos
  - `POST /api/v1/auth/usuarios/{id}/desactivar/` — soft deactivate (`is_active=False`)
  - Usuarios desactivados no pueden hacer login (verificar en `LoginView`)
- [x] **Frontend:** crear página `/admin/usuarios`
  - Tabla de usuarios con email, rol, estado activo/inactivo
  - Modal para crear nuevo usuario (email + rol + contraseña temporal)
  - Botón desactivar con confirmación (ConfirmDialog con email como palabra clave)
  - Solo visible en sidebar para rol `ADMIN` (usar `RoleGate`)
- [x] Agregar ruta en `AppLayout` / router y en `menuItems` de `routes.js` con `roles: ['ADMIN']`

---

### 1.2 Trazabilidad de lotes en el frontend (RF-AUD-02) 🟡

El endpoint `GET /api/v1/inventario/trazabilidad/{lote_id}/` ya existe y está testeado (INV-012). Solo falta exponerlo en la UI.

- [x] **Frontend:** agregar columna "Ver historial" en `LotesPage` que abra un modal o navegue a `/inventario/lotes/{id}/trazabilidad`
- [x] Crear `TrazabilidadModal.jsx` o `TrazabilidadPage.jsx` que muestre la lista de movimientos del lote (tipo, fecha, bodega origen/destino, cantidad, usuario)
- [x] Conectar al endpoint existente con `useQuery`

---

### 1.3 Dashboard gerencial completo (RF-IND-01, IND-02, IND-05, IND-07) 🔴

El dashboard actual tiene 3 tarjetas planas. El cliente necesita indicadores reales de gestión.

- [x] **Backend:** crear endpoints KPIs en `apps.indicadores` (`/kpis/` con tipos stock, vencimientos, produccion) y `/exportar/` (PDF + xlsx)
- [x] **Frontend:** ampliar `Dashboard.jsx` con tarjeta stock BP, tabla de lotes próximos a vencer (top 5), sección de exportar
- [x] **Exportación PDF/Excel (RF-IND-05):** endpoints `/kpis/` y `/exportar/` + botón Exportar con rango de fechas en Dashboard
- [x] **Panel en tiempo real (RF-IND-07):** `refetchInterval: 60_000` en todos los queries del Dashboard
- [ ] **Backend:** crear endpoint `GET /api/v1/indicadores/resumen/` que devuelva:
  - Total stock Bodega Principal (en gramos/unidades por MP)
  - Rotación de inventario del último mes (consumo total / stock promedio)
  - Batidos de la semana (agrupados por día)
  - Lotes próximos a vencer (en los próximos 7 días)
  - Total órdenes de compra pendientes
- [ ] **Frontend:** ampliar `Dashboard.jsx` con al menos:
  - Tarjeta de rotación de inventario con período visible
  - Tabla de lotes próximos a vencer (top 5)
  - Contador de OC pendientes
- [ ] **Exportación PDF/Excel (RF-IND-05):**
  - Backend: endpoint `GET /api/v1/indicadores/exportar/?formato=pdf|excel&desde=&hasta=`
  - Frontend: botón "Exportar" en Dashboard con selector de rango de fechas
  - Usar `openpyxl` para Excel y `reportlab` o `weasyprint` para PDF en el backend
- [ ] **Panel en tiempo real (RF-IND-07):** los KPIs del dashboard deben refrescarse automáticamente cada 60 segundos (usar `refetchInterval` en React Query) o via WebSocket si hay un evento de cambio

---

### 1.4 Zonas en bodegas (RF-INV-07) 🟡

El modelo `Bodega` solo tiene `nombre` y `tipo`. No hay zonas.

- [x] **Backend:** agregar modelo `ZonaBodega`:
  ```python
  class ZonaBodega(models.Model):
      bodega = models.ForeignKey(Bodega, on_delete=models.CASCADE, related_name='zonas')
      nombre = models.CharField(max_length=100)  # ej: "Estante A", "Refrigeración"
      descripcion = models.TextField(blank=True)
  ```
- [x] Crear migración y endpoint CRUD en `inventario/api/v1/`
- [x] Asociar `Lote` a una `ZonaBodega` (opcional, `null=True` para no romper datos existentes)
- [x] **Frontend:** en `BodegasPage.jsx`, mostrar y gestionar las zonas de cada bodega (tabla expandible o modal)

---

### 1.5 Timeout de inactividad de sesión (RF-AUT-03) 🟢

La sesión debe cerrarse tras 30 minutos de inactividad del usuario.

- [x] **Frontend:** crear hook `useInactivityLogout(minutes = 30)` que escucha eventos `mousemove`, `keydown`, `click` y resetea un timer; al cumplirse el tiempo sin actividad, llama a `clearAuth()` y navega a `/login`
- [x] Activar el hook en `AppLayout.jsx`
- [x] Mostrar un toast de aviso 2 minutos antes del cierre automático ("Tu sesión expirará en 2 minutos por inactividad")

---

## 2. Should Have — importante pero no bloqueante

### 2.1 Importación Excel/CSV — solo falta la UI (RF-CAT-07) 🟢

El endpoint `POST /api/v1/catalogo/importar/` ya existe (`ImportarCatalogoView`). Solo falta la página.

- [x] **Frontend:** botón "Importar Excel" en `MateriasPrimasPage.jsx` _(ya existía)_
- [x] `<input type="file" accept=".xlsx,.csv">` oculto disparado por el botón _(ya existía)_
- [x] Resultado: toast con procesados/creados/errores detallados por fila _(ya existía)_
- [x] Descargar plantilla: botón "Descargar plantilla" llama a `descargarPlantilla()` _(ya existía)_

---

### 2.2 Kardex por materia prima (RF-INV-10) 🟡

Historial cronológico de todos los movimientos de una MP: entradas, traslados, consumos, devoluciones, descartes.

- [x] **Backend:** crear endpoint `GET /api/v1/inventario/kardex/?materia_prima={id}&desde=&hasta=` que devuelva `MovimientoInventario` filtrado con saldo acumulado calculado
- [x] **Frontend:** agregar pestaña "Kardex" en `InventarioLayout` o botón "Ver kardex" en `StockPage`
- [x] Tabla con columnas: Fecha · Tipo · Lote · Bodega origen → destino · Cantidad · Saldo acumulado
- [x] Filtros por rango de fechas y tipo de movimiento

---

### 2.3 Comprobante PDF real de recepción (RF-REC-06) 🟡

El botón "Imprimir" en `DetalleRecepcionPage` abre `window.print()`. Eso no es un PDF con membrete Daluzed.

- [x] **Backend:** endpoint `GET /api/v1/recepcion/recepciones/{id}/pdf/` que devuelva un PDF generado con logo Daluzed, datos del proveedor, detalles del lote, usuario y fecha
- [x] Usar `reportlab` o `weasyprint` + template HTML
- [x] **Frontend:** reemplazar el botón "Imprimir" por "Descargar PDF" que haga `window.open(url_del_pdf)`

---

### 2.4 Recepciones parciales (RF-REC-05) 🟡

Verificar si una OC con 10 unidades puede recibirse en 2 momentos distintos (5 + 5), conservando saldo pendiente.

- [x] **Backend:** verificar que `OrdenCompra` tenga campo de cantidad recibida vs cantidad pedida por línea
- [x] Si no existe: agregar `cantidad_recibida` a `DetalleOrdenCompra` y lógica que actualice el estado de la OC (`PENDIENTE` → `PARCIAL` → `RECIBIDA`)
- [x] **Frontend:** en `OrdenesPage`, mostrar estado `PARCIAL` con el saldo pendiente visible
- [x] Permitir registrar una segunda recepción contra la misma OC mientras tenga saldo pendiente

---

### 2.5 Cambio de contraseña desde perfil 🟢

`Perfil.jsx` solo muestra datos de solo lectura. El usuario no puede cambiar su propia contraseña.

- [x] **Backend:** endpoint `POST /api/v1/auth/cambiar-contrasena/` — `CambiarContrasenaView` con validación completa _(ya existía)_
- [x] **Frontend:** sección "Cambiar contraseña" en `Perfil.jsx` con los 3 campos, validación de coincidencia y error handling _(ya existía; testeado en `Perfil.test.jsx`)_

---

### 2.6 Bitácora de operaciones críticas (RF-AUT-05, RF-AUD-03) 🔴

Registro de quién hizo qué, cuándo y desde qué IP. No existe en el sistema.

- [ ] **Backend:** crear modelo `BitacoraOperacion`:
  ```python
  class BitacoraOperacion(models.Model):
      usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
      accion = models.CharField(max_length=100)  # ej: "RECEPCION_CREADA", "TRASLADO"
      detalle = models.JSONField()               # datos relevantes de la operación
      ip = models.GenericIPAddressField(null=True)
      fecha = models.DateTimeField(auto_now_add=True)
  ```
- [ ] Registrar en servicios críticos: login, logout, recepción, traslado, batido, compensatorio, despacho
- [ ] Endpoint `GET /api/v1/auditoria/bitacora/` solo para ADMIN
- [ ] **Frontend:** página `/admin/bitacora` con tabla filtrable por usuario, acción y fecha

---

### 2.7 Configuración de canales de alerta (RF-ALR-05) 🟡

Los destinatarios de WhatsApp y email deberían poderse cambiar sin tocar código ni hacer redeploy.

- [ ] **Backend:** modelo `ConfiguracionAlerta` con campos `whatsapp_numero`, `email_gerencia`, `email_produccion`, `dias_umbral_vencimiento`
- [ ] Endpoint CRUD solo para ADMIN
- [ ] Usar esa configuración en `AlertaService` en vez de variables de entorno hardcodeadas
- [ ] **Frontend:** página de configuración en el módulo de alertas (visible solo para ADMIN)

---

### 2.8 Utilización de bodega por zona (RF-IND-04) 🟡

Depende de que se implementen las zonas (punto 1.4). Una vez implementadas:

- [ ] **Backend:** endpoint `GET /api/v1/indicadores/utilizacion-bodega/` que calcule stock actual / capacidad configurada por zona
- [ ] **Frontend:** tarjeta o sección en Dashboard con barras de progreso por zona

---

### 2.9 Reportes históricos semanales (RF-IND-06) 🟡

- [ ] **Backend:** endpoint `GET /api/v1/indicadores/reporte-semanal/?desde=&hasta=` que devuelva batidos, recepciones y despachos agrupados por semana
- [ ] Exportable a Excel (reutilizar la infraestructura del punto 1.3)
- [ ] **Frontend:** sección "Reportes" en el módulo de indicadores con selector de semana y tabla de resultados

---

### 2.10 AlertaService — implementar o documentar estado (RF-ALR-03, ALR-04) 🔴

`test_alertas.py` importa `AlertaService` con el comentario `# servicio de negocio a implementar`. Las notificaciones WhatsApp y email son Must Have en el SRS.

- [x] Verificar con `grep -r "class AlertaService" apps/alertas/` si ya existe
- [x] Si no existe: implementar `apps/alertas/services.py` con:
  - `verificar_stock_reorden(mp)` — consulta lotes de BP y crea alerta si está bajo el punto de reorden
  - `verificar_vencimientos(dias_umbral)` — crea alertas para lotes próximos a vencer
  - `verificar_lotes_en_espera(horas_umbral)` — crea alertas para LoteProductoTerminado con > N horas en EN_ESPERA
  - `enviar_whatsapp(alerta)` — Twilio sandbox
  - `enviar_email(alerta, destinatario)` — SMTP
- [x] Conectar el servicio a señales Django (`post_save` en `Lote`) — `apps/alertas/signals.py` conectado en `AlertasConfig.ready()`
- [x] Verificar que los 8 tests de `test_alertas.py` pasen — 9/9 incluyendo ALR-009 (signal integration)

---

## 3. No funcionales — infraestructura y calidad

### 3.1 Docker (RNF-POR-02) 🟡

No hay `Dockerfile` ni `docker-compose.yml` en el proyecto.

- [ ] Crear `Dockerfile` para el backend Django (Python 3.12 slim, gunicorn, collectstatic)
- [ ] Crear `docker-compose.yml` con servicios: `backend`, `postgres`, `redis`, `celery`
- [ ] Verificar que el entorno levante con `docker compose up` en una sola instrucción
- [ ] Agregar `.dockerignore`

---

### 3.2 Despliegue cloud (RNF-POR-01) 🔴

El sistema debe estar disponible desde Colombia antes del Corte 3.

- [ ] Crear proyecto en Railway para el backend (Django + PostgreSQL + Redis)
- [ ] Crear proyecto en Vercel para el frontend (React SPA)
- [ ] Configurar variables de entorno de producción (`.env.production`)
- [ ] Verificar HTTPS activo en ambos (RNF-SEC-02)
- [ ] Verificar que CORS esté configurado para el dominio de Vercel

---

### 3.3 CI/CD (RNF-MAN-04) 🟡

No hay pipeline de integración continua.

- [ ] Crear `.github/workflows/ci.yml` que ejecute en cada PR:
  - `python manage.py test apps` (backend)
  - `npm run test` (frontend)
- [ ] Opcionalmente: agregar paso de lint (`flake8` o `ruff` en backend, `eslint` en frontend)

---

### 3.4 Swagger / OpenAPI accesible (RNF-MAN-03) 🟢

`drf-spectacular` está instalado pero verificar que el endpoint esté expuesto y funcione.

- [x] Verificar que `core/urls.py` tenga rutas para `/api/docs/` y `/api/schema/` _(ambas rutas existen)_
- [x] Confirmar que el schema sea completo — rutas y ViewSets tienen `@extend_schema`; 21 APIViews sin serializer_class quedan fuera del schema autogenerado (no bloquea renderizado)
- [x] Acceder a `/api/docs/` en local y verificar que renderice correctamente _(Swagger UI carga; endpoints con schema aparecen)_

---

### 3.5 WCAG 2.1 AA en módulos críticos (RNF-ACC-01) 🟡

- [ ] Instalar `@axe-core/react` o usar Lighthouse en modo accessibility
- [ ] Verificar score ≥ 90 en: Login, Dashboard, NuevaRecepcionPage, NuevoBatidoPage
- [ ] Corregir issues encontrados (contraste, labels de inputs, foco visible, atributos ARIA)

---

### 3.6 Backup automático de BD (RNF-AVA-02) 🟢

- [ ] Configurar backup diario de PostgreSQL en Railway (o el proveedor elegido)
- [ ] Verificar retención mínima de 7 días
- [ ] Documentar el proceso de restauración

---

## 4. Más allá de los requisitos — mejoras de UX

### 4.1 Código de color en lotes por proximidad de vencimiento 🟢

En `LotesPage` y donde se muestre una lista de lotes, agregar indicador visual:

- [x] Verde: vence en más de 30 días
- [x] Amarillo: vence entre 7 y 30 días
- [x] Rojo: vence en menos de 7 días o ya venció
- [x] Implementar con una función helper `getVencimientoTone(fecha_vencimiento)` en `src/utils/vencimiento.js` y aplicada en `LotesPage`

---

### 4.2 Dashboard con gráficas 🟡

Ampliar el dashboard con visualizaciones que el gerente pueda leer de un vistazo:

- [ ] Instalar `recharts` (ligero, React-native): `npm install recharts`
- [ ] Gráfica de línea: batidos por día de la semana actual
- [ ] Gráfica de barras: stock en Bodega Principal por categoría de MP
- [ ] Visible solo para roles ADMIN y GERENTE

---

### 4.3 Vista de jornada con timeline de batidos 🟡

`JornadaPage` existe pero muestra los batidos como tabla plana.

- [ ] Agregar una vista de línea de tiempo donde cada batido aparezca con su hora de inicio, producto y estado (EN_PROCESO / COMPLETADO)
- [ ] Permite ver de un vistazo cuántas máquinas están ocupadas en este momento
- [ ] Toggle entre vista tabla y vista timeline

---

### 4.4 Detalle expandible de lote en LotesPage 🟢

Al hacer click en una fila de `LotesPage`, expandir una sección inline con:

- [ ] Historial de movimientos del lote (consumir el endpoint de trazabilidad existente)
- [ ] Fecha de entrada, vencimiento, número de lote, proveedor
- [ ] Sin navegar a una página nueva — usando un accordeon o row expansion

---

### 4.5 Indicador de stock comprometido en PDP 🟡

Cuando hay un batido `EN_PROCESO`, el stock de Bodega PDP está parcialmente comprometido. El sistema actualmente no lo refleja visualmente.

- [ ] Backend: calcular stock "disponible" = stock PDP − cantidad comprometida en batidos EN_PROCESO
- [ ] Frontend: mostrar en `StockPage` dos columnas: "Stock PDP" y "Disponible para producción"

---

### 4.6 Perfil con foto / avatar inicial 🟢

`Perfil.jsx` muestra solo texto.

- [x] Agregar un avatar generado automáticamente con las iniciales del email y el color del rol _(`Avatar.jsx` + `getInitials.js` implementados; usado en `Perfil.jsx`)_
- [x] Sin upload de imagen — solo iniciales con color de fondo, no requiere backend _(ADMIN=cherry-500/rojo, GERENTE=peach-300, PRODUCCION=butter-200, INVENTARIO=mint-200)_

---

## Resumen por prioridad

| Prioridad | Ítem | Tamaño |
|-----------|------|--------|
| 🔥 +I | Placeholders en inputs (0.1) | 🟢 |
| 🔥 +I | Confirmación doble en acciones destructivas (0.2) | 🟢 |
| 🔥 +I | Errores con descripción concreta (0.3) | 🟢 |
| 🔥 +I | Eliminar `console.log` con username (0.4) | 🟢 |
| 🔥 +I | Reemplazar campo JSON crudo (0.5) | 🟡 |
| 🔥 +I | Proveedores activo/inactivo en OC (0.6) | 🟡 |
| 🚨 M | Gestión de usuarios (1.1) | 🔴 |
| 🚨 M | Dashboard completo + exportación (1.3) | 🔴 |
| 🚨 M | AlertaService implementar (2.10) | 🔴 |
| 🚨 M | Trazabilidad frontend (1.2) | 🟡 |
| 🚨 M | Zonas en bodegas (1.4) | 🟡 |
| 🚨 M | Timeout inactividad (1.5) | 🟢 |
| ⚠️ S | Importación CSV UI (2.1) | 🟢 |
| ⚠️ S | Kardex (2.2) | 🟡 |
| ⚠️ S | PDF comprobante real (2.3) | 🟡 |
| ⚠️ S | Recepciones parciales (2.4) | 🟡 |
| ⚠️ S | Cambio de contraseña (2.5) | 🟢 |
| ⚠️ S | Bitácora auditoría (2.6) | 🔴 |
| ⚠️ S | Config canales alerta (2.7) | 🟡 |
| ⚠️ S | Reportes semanales (2.9) | 🟡 |
| 🏗️ INF | Docker (3.1) | 🟡 |
| 🏗️ INF | Despliegue cloud (3.2) | 🔴 |
| 🏗️ INF | CI/CD (3.3) | 🟡 |
| 🏗️ INF | Swagger verificar (3.4) | 🟢 |
| 🏗️ INF | WCAG accessibility (3.5) | 🟡 |
| 🏗️ INF | Backup BD (3.6) | 🟢 |
| ✨ + | Color lotes vencimiento (4.1) | 🟢 |
| ✨ + | Dashboard con gráficas (4.2) | 🟡 |
| ✨ + | Timeline jornada (4.3) | 🟡 |
| ✨ + | Detalle expandible lote (4.4) | 🟢 |
| ✨ + | Stock comprometido PDP (4.5) | 🟡 |
| ✨ + | Avatar por iniciales (4.6) | 🟢 |

despues de acabarlos todos, hay que crear de nuevo los seeds actualizados con todo lo nuevo hecho.