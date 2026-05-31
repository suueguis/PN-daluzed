# PLAN_FRONTEND.md — Daluzed Inventario

  1. Plan 0 primero (todo lo demás depende de él).
  2. Después Planes 1, 2 y 6 en paralelo.
  3. Después 3 y 4 (necesitan datos de Plan 2).
  4. Último Plan 5 (necesita stock en PDP del Plan 3).

Planes aislados para implementar el frontend de cada módulo del backend.
Cada plan está pensado para ejecutarse en una terminal independiente.

**Orden obligatorio:** ejecutar `Plan 0` primero (layout + tema + tests + librerías).
Los planes 1 → 6 se pueden ejecutar en paralelo después.

---

## 🎨 Paleta de colores — "Cálida pastel de pastelería"

Inspirada en el logo de Daluzed (rosa fucsia + cerezas rojas + vino oscuro):

| Token Tailwind     | Hex       | Uso                              |
|--------------------|-----------|----------------------------------|
| `cream-50`         | `#FFF8F0` | Fondo principal de la app        |
| `cream-100`        | `#FAF1E4` | Fondo de cards / surfaces        |
| `peach-200`        | `#FCE4D8` | Hover suave / divisores          |
| `peach-300`        | `#F8C9B0` | Bordes acentuados                |
| `rose-300`         | `#F4A6B8` | Botones secundarios              |
| `rose-500`         | `#E85978` | **Color de marca** (botones CTA) |
| `wine-700`         | `#8B2C3F` | Texto sobre rose / títulos       |
| `wine-900`         | `#6B1A2A` | Texto principal del wordmark     |
| `cherry-500`       | `#C9152E` | Alertas críticas / errores       |
| `butter-200`       | `#FCE4A8` | Warnings (vencimientos próximos) |
| `mint-200`         | `#D4E8D4` | Éxito (operación exitosa)        |
| `slate-100`        | `#F1F0EE` | Disabled / sin stock             |

Tipografía:
- Títulos: **Crushed** (ya usada en `App.jsx`) — se ve como repostería.
- Cuerpo: **Inter** o **Nunito** (importar desde Google Fonts).

---

# Plan 0 — Layout global, tema, rutas protegidas y herramientas (HACER PRIMERO)

**Branch:** `feature/fe-00-layout-base`

## Objetivo
Crear la base sobre la que todos los demás planes construyen: tema Tailwind v4 con
paleta cálida, layout con sidebar, rutas protegidas por rol, instalación de Vitest
y librerías comunes (react-hook-form, zod, @tanstack/react-query, sonner).

## Prerrequisitos
- Backend corriendo en `http://localhost:8000`
- Login funcional (ya está)

## Pasos

### 1. Instalar dependencias
```bash
cd frontend
npm install @tanstack/react-query react-hook-form @hookform/resolvers zod \
  sonner clsx tailwind-merge date-fns
npm install -D vitest @vitest/coverage-v8 \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom axios-mock-adapter \
  @types/node
```

### 2. Configurar paleta en Tailwind v4
Crear / editar `frontend/src/index.css` añadiendo `@theme`:
```css
@import "tailwindcss";

@theme {
  --color-cream-50: #FFF8F0;
  --color-cream-100: #FAF1E4;
  --color-peach-200: #FCE4D8;
  --color-peach-300: #F8C9B0;
  --color-rose-300: #F4A6B8;
  --color-rose-500: #E85978;
  --color-wine-700: #8B2C3F;
  --color-wine-900: #6B1A2A;
  --color-cherry-500: #C9152E;
  --color-butter-200: #FCE4A8;
  --color-mint-200: #D4E8D4;
  --color-slate-100: #F1F0EE;
  --font-crushed: "Crushed", serif;
  --font-display: "Nunito", system-ui, sans-serif;
}

body {
  font-family: var(--font-display);
  background-color: var(--color-cream-50);
  color: var(--color-wine-900);
}
```

### 3. Configurar Vitest
Crear `frontend/vitest.config.js`:
```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
});
```

Crear `frontend/src/__tests__/setup.js`:
```js
import '@testing-library/jest-dom';
```

Agregar en `package.json`:
```json
"test": "vitest run --coverage",
"test:watch": "vitest"
```

### 4. Estructura de carpetas
```
frontend/src/
  components/
    layout/AppLayout.jsx       ← sidebar + topbar + outlet
    layout/Sidebar.jsx          ← navegación por rol
    layout/TopBar.jsx           ← logo + perfil + logout
    ui/Button.jsx               ← variantes primary/secondary/ghost/danger
    ui/Input.jsx
    ui/Select.jsx
    ui/Modal.jsx
    ui/Table.jsx                ← tabla genérica + paginación
    ui/EmptyState.jsx
    ui/Spinner.jsx
    ui/Badge.jsx                ← estados (EN_ESPERA, COMPLETADO, etc.)
    ProtectedRoute.jsx          ← redirige a /login si no auth
    RoleGate.jsx                ← muestra/oculta por rol
  hooks/
    useApi.js                   ← wrapper de useQuery / useMutation
    useDebounce.js
  utils/
    cn.js                       ← clsx + tailwind-merge
    formatters.js               ← fechas, decimales, etc.
  config/
    routes.js                   ← mapa central de rutas
    queryClient.js              ← QueryClient con defaultOptions
```

### 5. Layout (`AppLayout.jsx`)
- Sidebar fija a la izquierda (220px), color de fondo `bg-cream-100`, borde derecho `border-peach-200`.
- TopBar arriba (60px), `bg-white`, sombra suave, contiene logo + nombre del usuario + botón logout.
- Contenido en el centro: `bg-cream-50` con `p-6`.
- Logo `<img src="/logo.png" />` en el TopBar (~40px alto).

### 6. Sidebar — items por rol
```js
const menuItems = [
  { path: '/dashboard',      label: 'Inicio',      roles: ['*'] },
  { path: '/catalogo',       label: 'Catálogo',    roles: ['ADMIN', 'GERENTE', 'INVENTARIO'] },
  { path: '/inventario',     label: 'Inventario',  roles: ['ADMIN', 'GERENTE', 'INVENTARIO'] },
  { path: '/recepcion',      label: 'Recepción',   roles: ['ADMIN', 'INVENTARIO'] },
  { path: '/produccion',     label: 'Producción',  roles: ['ADMIN', 'PRODUCCION'] },
  { path: '/alertas',        label: 'Alertas',     roles: ['*'] },
];
```

### 7. Rutas en `App.jsx`
```jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/catalogo/*"   element={<div>placeholder</div>} />
    <Route path="/inventario/*" element={<div>placeholder</div>} />
    <Route path="/recepcion/*"  element={<div>placeholder</div>} />
    <Route path="/produccion/*" element={<div>placeholder</div>} />
    <Route path="/alertas/*"    element={<div>placeholder</div>} />
  </Route>
  <Route path="*" element={<Navigate to="/dashboard" />} />
</Routes>
```

### 8. QueryClient y Provider
Envolver `<App />` en `main.jsx`:
```jsx
<QueryClientProvider client={queryClient}>
  <App />
  <Toaster position="top-right" />
</QueryClientProvider>
```

### 9. Tests Vitest
- `AppLayout.test.jsx` — renderiza sidebar con items visibles por rol
- `ProtectedRoute.test.jsx` — redirige a /login si no auth
- `Button.test.jsx` — variantes aplican clases correctas
- `Table.test.jsx` — pagina, muestra empty state

### 10. Criterios de aceptación
- [ ] `npm run dev` muestra layout con sidebar + logo arriba
- [ ] Login redirige a `/dashboard` con layout aplicado
- [ ] Sidebar muestra solo items del rol del usuario logueado
- [ ] Logout limpia auth y redirige a `/login`
- [ ] `npm test` corre Vitest y pasan ≥ 4 tests
- [ ] Colores cálidos pastel visibles en toda la UI

---

# Plan 1 — AUT (Autenticación: completar)

**Branch:** `feature/fe-01-aut`
**Depende de:** Plan 0

## Backend disponible
| Método | Endpoint                          | Para qué                     |
|--------|-----------------------------------|------------------------------|
| POST   | `/api/v1/auth/login/`             | Login                        |
| POST   | `/api/v1/auth/logout/`            | Logout (blacklist refresh)   |
| POST   | `/api/v1/auth/token/refresh/`     | Refresh access token         |

## Pasos

### 1. Mejorar `pages/Login.jsx`
- Loading state durante el POST
- Toast error con `sonner` si credenciales fallan
- Manejo de error 423 (cuenta bloqueada por Axes) → mensaje específico
- Validación con `react-hook-form` + `zod`

### 2. Crear `pages/Perfil.jsx`
- Muestra: email, rol, último login
- Botón "Cerrar sesión" que llama `/auth/logout/` y limpia store

### 3. Dashboard inicial
- Saludo personalizado ("Hola, {email}")
- Cards con resúmenes (stub al inicio: total MPs, alertas activas, batidos del día)
- Estos cards se llenarán cuando los módulos respectivos estén listos

### 4. RoleGate component
```jsx
<RoleGate allowed={['ADMIN', 'GERENTE']}>
  <button>Solo admin/gerente ve este botón</button>
</RoleGate>
```

### 5. Tests Vitest
- `Login.test.jsx` — submit con credenciales válidas → llama API
- `Login.test.jsx` — error 401 muestra toast
- `RoleGate.test.jsx` — oculta children si rol no autorizado

### 6. Criterios de aceptación
- [ ] Login muestra spinner durante el submit
- [ ] Error de credenciales muestra toast amarillo/rojo
- [ ] Perfil muestra datos del usuario
- [ ] Logout limpia tokens y cookie HttpOnly

---

# Plan 2 — CAT (Catálogo Maestro)

**Branch:** `feature/fe-02-catalogo`
**Depende de:** Plan 0

## Backend disponible
Base: `/api/v1/catalogo/`

| Recurso              | Endpoint                      | Métodos                  |
|----------------------|-------------------------------|--------------------------|
| Unidades de medida   | `unidades/`                   | GET, POST, PATCH, DELETE |
| Proveedores          | `proveedores/`                | GET, POST, PATCH, DELETE |
| Materias primas      | `materias-primas/`            | GET, POST, PATCH, DELETE |
| Presentaciones       | `presentaciones/`             | GET, POST, PATCH, DELETE |
| Productos terminados | `productos-terminados/`       | GET, POST, PATCH, DELETE |
| Importar Excel       | `materias-primas/importar/`   | POST (multipart)         |

## Pasos

### 1. Estructura de páginas
```
pages/catalogo/
  CatalogoLayout.jsx        ← tabs: Unidades / Proveedores / MP / Productos / Presentaciones
  UnidadesPage.jsx
  ProveedoresPage.jsx
  MateriasPrimasPage.jsx
  ProductosTerminadosPage.jsx
  PresentacionesPage.jsx
```

### 2. Cada página tiene
- Tabla paginada con búsqueda (search debounceado 300ms)
- Botón **"Nuevo"** → abre `<Modal>` con formulario
- Click en fila → modal de **editar**
- Botón eliminar con `<Confirm>` modal
- Filtros: por categoría (MP), por activo/inactivo

### 3. API client
Crear `api/catalogoAPI.js`:
```js
export const unidadesAPI = {
  list: (params) => axiosClient.get('/catalogo/unidades/', { params }),
  create: (data) => axiosClient.post('/catalogo/unidades/', data),
  update: (id, data) => axiosClient.patch(`/catalogo/unidades/${id}/`, data),
  delete: (id) => axiosClient.delete(`/catalogo/unidades/${id}/`),
};
// ...igual para proveedores, materiasPrimas, etc.
```

### 4. Hooks por recurso
```js
// hooks/catalogo/useMateriasPrimas.js
export const useMateriasPrimasQuery = (params) =>
  useQuery({ queryKey: ['mp', params], queryFn: () => materiasPrimasAPI.list(params) });

export const useCreateMP = () =>
  useMutation({ mutationFn: materiasPrimasAPI.create, onSuccess: () => qc.invalidateQueries({queryKey:['mp']}) });
```

### 5. Formulario MateriaPrima — campos
- nombre (text, required)
- unidad_medida_id (select, required)
- punto_reorden (decimal, ≥ 0)
- dias_minimos_vencimiento (int, nullable)
- categoria (select: GALLETERIA/TORTA/BIZCOCHO/GENERAL)
- condicion_almacenamiento (select: AMBIENTE/REFRIGERACION/CONGELADO)
- proveedores (multi-select)
- activo (checkbox)

### 6. Botón "Importar Excel"
- `<input type="file" accept=".xlsx" />`
- POST multipart a `/catalogo/materias-primas/importar/`
- Muestra toast de éxito + lista de filas creadas/erróneas

### 7. Tests Vitest
- `MateriasPrimasPage.test.jsx` — renderiza tabla con datos mock (axios-mock-adapter)
- `MateriaPrimaForm.test.jsx` — submit válido llama API, error muestra toast
- `useMateriasPrimas.test.jsx` — hook devuelve `data` después de mock

### 8. Criterios de aceptación
- [ ] Las 5 pestañas (Unidades/Proveedores/MP/Productos/Presentaciones) funcionan
- [ ] CRUD completo en cada una
- [ ] Búsqueda + paginación funcionan
- [ ] Importar Excel funciona y muestra resumen

---

# Plan 3 — INV (Inventario)

**Branch:** `feature/fe-03-inventario`
**Depende de:** Plan 0 + ideal tras Plan 2 (necesita MPs creadas)

## Backend disponible
Base: `/api/v1/inventario/`

| Acción                 | Endpoint                                          | Método |
|------------------------|---------------------------------------------------|--------|
| Listar bodegas         | `bodegas/`                                        | GET    |
| CRUD bodegas           | `bodegas/{id}/`                                   | POST/PATCH/DELETE |
| Listar lotes           | `lotes/?materia_prima=&bodega=&vence_antes_de=`   | GET    |
| Consultar stock        | `stock/?materia_prima=&bodega=`                   | GET    |
| Consultar reorden      | `reorden/?materia_prima=`                         | GET    |
| Sugerencia FEFO        | `fefo/?materia_prima=&bodega=`                    | GET    |
| Traslado               | `traslados/`                                      | POST   |
| Devolución             | `devoluciones/`                                   | POST   |
| Descarte               | `descartes/`                                      | POST   |

## Pasos

### 1. Páginas
```
pages/inventario/
  InventarioLayout.jsx
  StockPage.jsx           ← tabla pivot: MP × Bodega → cantidad
  LotesPage.jsx           ← listado con filtros (MP, bodega, vencimiento)
  BodegasPage.jsx         ← CRUD bodegas
  TrasladosPage.jsx       ← form + histórico de movimientos
  DevolucionesPage.jsx
  DescartesPage.jsx
```

### 2. StockPage
- Tabla con columnas: Materia Prima | Bodega Principal | Bodega PDP | Total
- Botón en cada fila: "Trasladar a PDP" (abre form)
- Indicador visual rojo si está bajo punto_reorden

### 3. LotesPage
- Filtros: MP, Bodega, vencimiento (próximos 7/30 días, vencidos)
- Columnas: # Lote | MP | Bodega | Cantidad | Vencimiento | Días restantes | Acciones
- Badge color según días restantes: `cherry-500` (vencido), `butter-200` (≤ 7 días), `mint-200` (> 30 días)
- Acciones: Devolver, Descartar

### 4. Form Traslado
- Select MP → al elegir, GET `/inventario/fefo/` para sugerir lote
- Select lote (con sugerencia FEFO destacada)
- Select bodega destino (solo PDP)
- Cantidad (≤ lote.cantidad)

### 5. Form Devolución / Descarte
- Select lote
- Motivo (textarea required)
- POST al endpoint correspondiente
- Después: invalidate stock/lotes queries

### 6. Tests Vitest
- `StockPage.test.jsx` — muestra tabla con stock mockeado, marca fila bajo reorden
- `LotesPage.test.jsx` — filtros funcionan
- `TrasladoForm.test.jsx` — sugerencia FEFO se muestra
- `DevolucionForm.test.jsx` — submit válido invalida queries

### 7. Criterios de aceptación
- [ ] Stock pivot muestra todas las MP × bodegas
- [ ] Filtros de lotes funcionan combinados
- [ ] Traslado descuenta del origen y crea lote en destino
- [ ] Devolución pone cantidad a 0
- [ ] Sugerencia FEFO se muestra y selecciona automáticamente

---

# Plan 4 — REC (Recepción)

**Branch:** `feature/fe-04-recepcion`
**Depende de:** Plan 0 + ideal tras Plan 2 (necesita proveedores + MPs)

## Backend disponible
Base: `/api/v1/recepcion/`

| Acción                      | Endpoint                        | Método |
|-----------------------------|---------------------------------|--------|
| Listar órdenes              | `ordenes/`                      | GET    |
| Crear orden                 | `ordenes/`                      | POST   |
| Detalle orden               | `ordenes/{id}/`                 | GET    |
| Listar recepciones          | `/`                             | GET    |
| Registrar recepción         | `/`                             | POST   |
| Detalle recepción           | `/{id}/`                        | GET    |

## Pasos

### 1. Páginas
```
pages/recepcion/
  RecepcionLayout.jsx     ← tabs: Órdenes / Recepciones
  OrdenesPage.jsx
  NuevaOrdenPage.jsx      ← form con detalles dinámicos
  RecepcionesPage.jsx
  NuevaRecepcionPage.jsx  ← form ligado a OC + validación días mínimos
```

### 2. Form Nueva Orden
- Select proveedor
- Detalles dinámicos (botón "+ Agregar línea"):
  - MP + Presentación + cantidad_presentacion
- Botón "Crear OC" → POST + redirect a lista

### 3. Form Nueva Recepción (el más crítico)
- Select OC pendiente (filtrar `estado=PENDIENTE`)
- Al seleccionar OC: pre-llenar detalles desde la orden
- Por cada detalle: ingresar `fecha_vencimiento` + `numero_lote`
- Validación previa local: días restantes vs `mp.dias_minimos_vencimiento` → alertar
- Si backend devuelve 400 con `dias_minimos`: mostrar modal pidiendo `justificacion_vencimiento`
- Reintentar con justificación incluida

### 4. Detalle de Recepción (read-only)
- Cabecera: fecha, OC, usuario, confirmada
- Lista de lotes creados con cantidad en unidad base
- Botón "Imprimir" (window.print)

### 5. Tests Vitest
- `NuevaRecepcionPage.test.jsx` — días insuficientes muestra modal de justificación
- `NuevaRecepcionPage.test.jsx` — submit con justificación devuelve 201
- `OrdenesPage.test.jsx` — filtros por estado funcionan

### 6. Criterios de aceptación
- [ ] Crear OC con 1+ detalles funciona
- [ ] Recepción contra OC convierte unidades correctamente
- [ ] Validación de días mínimos bloquea + permite justificar
- [ ] Detalle recepción es inmutable (sin botones de editar/eliminar)

---

# Plan 5 — PROD (Producción)

**Branch:** `feature/fe-05-produccion`
**Depende de:** Plan 0 + ideal tras Plan 3 (necesita stock en PDP)

## Backend disponible
Base: `/api/v1/produccion/`

| Acción                | Endpoint                                    | Método |
|-----------------------|---------------------------------------------|--------|
| Listar batidos        | `batidos/`                                  | GET    |
| Registrar batido      | `batidos/`                                  | POST   |
| Sugerencia FEFO ing.  | `sugerencia-fefo/?producto_terminado_id=`   | GET    |
| Sugerencia FIFO desp. | `sugerencia-fifo/?producto_terminado_id=`   | GET    |
| Listar lotes PT       | `despachos/`                                | GET    |
| Despachar lote        | `despachos/{id}/despachar/`                 | POST   |
| Jornada del día       | `jornadas/?fecha=YYYY-MM-DD`                | GET    |
| Compensatorios CRUD   | `compensatorios/`                           | GET/POST |

## Pasos

### 1. Páginas
```
pages/produccion/
  ProduccionLayout.jsx       ← tabs: Batidos / Despachos / Jornada / Compensatorios
  BatidosPage.jsx
  NuevoBatidoPage.jsx        ← formulario con ingredientes dinámicos
  DespachosPage.jsx          ← lista de lotes PT EN_ESPERA
  JornadaPage.jsx            ← resumen del día
  CompensatoriosPage.jsx     ← tabla read-only + botón "Nuevo"
```

### 2. Form Nuevo Batido (crítico)
- Select producto terminado
- Date picker fecha producción (default: hoy)
- Time picker hora_inicio
- Tabla de ingredientes con botón "+ Agregar":
  - Select MP
  - Select lote (mostrar sugerencia FEFO destacada al elegir MP)
  - Cantidad
- Al hacer click "Sugerir FEFO": GET `/produccion/sugerencia-fefo/` y rellenar tabla
- Validación local: cantidad ≤ lote.cantidad disponible
- Si backend devuelve 400 con "faltante": toast con el mensaje
- Si 400 con "2 batidos": toast "Hay 2 batidos en proceso, espera a completarlos"

### 3. DespachosPage
- Lista de LoteProductoTerminado con `estado=EN_ESPERA`
- Columnas: # | Producto | Cantidad | Fecha producción | Días en espera | Acción
- Botón "Despachar" → POST `/despachos/{id}/despachar/` → confirma
- Filtro por producto + botón "Aplicar FIFO" (resalta el más antiguo)

### 4. JornadaPage
- Date picker (default hoy)
- Card con: total_batidos, completados, en_proceso
- Tabla de batidos del día

### 5. CompensatoriosPage
- Tabla con columnas: Fecha | Tipo afectado | ID | Datos originales | Datos corregidos | Descripción | Usuario
- Botón "Nuevo compensatorio":
  - Select tipo (Lote / Batido / LotePT)
  - Input ID
  - Textarea datos_originales (JSON con validación zod)
  - Textarea datos_corregidos (JSON)
  - Descripción

### 6. Tests Vitest
- `NuevoBatidoPage.test.jsx` — sugerir FEFO rellena la tabla
- `NuevoBatidoPage.test.jsx` — error de stock insuficiente muestra toast con MP y cantidad faltante
- `DespachosPage.test.jsx` — despachar cambia estado
- `CompensatoriosPage.test.jsx` — submit con JSON inválido marca error

### 7. Criterios de aceptación
- [ ] Registrar batido descuenta lotes y crea LoteProductoTerminado EN_ESPERA
- [ ] Sugerencia FEFO funciona para ingredientes
- [ ] Despachar es irreversible (botón solo aparece en EN_ESPERA)
- [ ] Compensatorio actualiza la cantidad del lote
- [ ] Jornada muestra agregados correctos

---

# Plan 6 — ALR (Alertas con WebSocket)

**Branch:** `feature/fe-06-alertas-ws`
**Depende de:** Plan 0

⚠️ Este plan tiene **dos fases**: backend (Channels) + frontend (cliente WS).

## Fase A — Backend (Django Channels)

### 1. Instalar dependencias backend
Añadir a `requirements.txt`:
```
channels==4.0.0
channels-redis==4.2.0
daphne==4.1.0
```
Y `pip install -r requirements.txt`. (Si no quieres correr Redis local, usa
`channels.layers.InMemoryChannelLayer` por ahora.)

### 2. `core/settings.py`
```python
INSTALLED_APPS = [
    'daphne',  # debe ir ANTES de django.contrib.staticfiles
    # ...resto
    'channels',
]

ASGI_APPLICATION = 'core.asgi.application'

# Layer en memoria para dev; en prod usar Redis.
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}
```

### 3. `core/asgi.py`
```python
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from apps.alertas.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
})
```

### 4. `apps/alertas/consumers.py`
```python
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class AlertasConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add('alertas', self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard('alertas', self.channel_name)

    async def alerta_nueva(self, event):
        await self.send(text_data=json.dumps(event))
```

### 5. `apps/alertas/routing.py`
```python
from django.urls import re_path
from . import consumers
websocket_urlpatterns = [
    re_path(r'ws/alertas/$', consumers.AlertasConsumer.as_asgi()),
]
```

### 6. Actualizar `apps/alertas/services.py`
Reemplazar el `channel_layer = None` placeholder por:
```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()

# Y en _enviar_websocket:
async_to_sync(channel_layer.group_send)('alertas', {...})
```
⚠️ Ojo: los tests existentes patchean `apps.alertas.services.channel_layer` —
mantener la importación a nivel de módulo para que el patch siga funcionando.

### 7. Correr con Daphne
```bash
daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

## Fase B — Frontend

### 1. Páginas
```
pages/alertas/
  AlertasLayout.jsx       ← tabs: Activas / Reorden / Vencimiento / Producción Vencida
  AlertasActivasPage.jsx
  AlertasReordenPage.jsx
  AlertasVencimientoPage.jsx
  AlertasProduccionPage.jsx
```

### 2. Store con WebSocket
Crear `store/alertasStore.js` (Zustand):
```js
const useAlertasStore = create((set, get) => ({
  alertas: [],
  ws: null,
  connect: () => {
    const ws = new WebSocket('ws://localhost:8000/ws/alertas/');
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      set((s) => ({ alertas: [data, ...s.alertas] }));
      toast(`Nueva alerta: ${data.tipo}`);
    };
    set({ ws });
  },
  disconnect: () => get().ws?.close(),
}));
```

### 3. Inicializar conexión WS en `AppLayout.jsx` (después de Plan 0)
```jsx
useEffect(() => {
  if (accessToken) alertasStore.connect();
  return () => alertasStore.disconnect();
}, [accessToken]);
```

### 4. Badge global en TopBar
- Contador de alertas activas no leídas
- Click → navega a `/alertas`

### 5. Páginas individuales
- Cada pestaña hace GET a su endpoint:
  - `/api/v1/alertas/reorden/`
  - `/api/v1/alertas/vencimiento/?dias=7`
  - `/api/v1/alertas/produccion-vencida/`
- Tabla con: Tipo | MP | Bodega | Mensaje | Fecha | Acción "Resolver"

### 6. Tests Vitest
- `alertasStore.test.js` — `connect()` setea WS y procesa mensajes
- `AlertasReordenPage.test.jsx` — renderiza alertas con badge cherry-500
- Mock de `WebSocket` global con `vi.stubGlobal`

### 7. Criterios de aceptación
- [ ] Backend acepta conexión WS en `ws://localhost:8000/ws/alertas/`
- [ ] Frontend recibe mensajes en tiempo real
- [ ] Toast aparece al recibir nueva alerta
- [ ] Badge en TopBar se actualiza sin recargar
- [ ] Las 4 pestañas listan alertas correctamente
- [ ] Tests AUT/CAT/INV/REC/PROD/ALR backend siguen pasando

---

## 📋 Resumen ejecutivo

| Plan | Módulo | Branch                          | Dependencias |
|------|--------|---------------------------------|--------------|
| 0    | Layout | `feature/fe-00-layout-base`     | Ninguna      |
| 1    | AUT    | `feature/fe-01-aut`             | Plan 0       |
| 2    | CAT    | `feature/fe-02-catalogo`        | Plan 0       |
| 3    | INV    | `feature/fe-03-inventario`      | Plan 0 (+2)  |
| 4    | REC    | `feature/fe-04-recepcion`       | Plan 0 (+2)  |
| 5    | PROD   | `feature/fe-05-produccion`      | Plan 0 (+3)  |
| 6    | ALR    | `feature/fe-06-alertas-ws`      | Plan 0       |

**Estrategia recomendada:**
1. Ejecutar Plan 0 → merge a `main`.
2. Ejecutar Plan 1, 2 y 6 en paralelo (no se pisan).
3. Ejecutar Plan 3 (necesita catálogo cargado de Plan 2).
4. Ejecutar Plan 4 (necesita catálogo de Plan 2).
5. Ejecutar Plan 5 (necesita stock en PDP del Plan 3).

Cada PR contra `main`. CI corre tests backend + lint + build frontend.
Cuando todos los planes estén mergeados: activar el step de Vitest en `.github/workflows/ci.yml`.
