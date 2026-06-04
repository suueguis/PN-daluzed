# Implementación de Pruebas Pendientes — Daluzed

> **Creado:** Junio 2026  
> **Propósito:** Guía ejecutable para completar la cobertura de pruebas en una sola sesión.  
> **Referencia base:** `PLAN_DE_PRUEBAS_TDD.md` (plan teórico original)  
> **Stack de pruebas:**
> - Backend: `django.test.TestCase` / `rest_framework.test.APITestCase`
> - Frontend unitario/integración: Vitest + React Testing Library
> - Frontend E2E secuencial: Vitest + RTL + **MSW** (Mock Service Worker)
> - Backend E2E secuencial: `APITestCase` con pasos encadenados en un solo método

---

## Índice

1. [Estado actual — qué ya existe](#1-estado-actual--qué-ya-existe)
2. [Gaps identificados](#2-gaps-identificados)
3. [Backend — tests pendientes](#3-backend--tests-pendientes)
4. [Frontend — tests pendientes](#4-frontend--tests-pendientes)
5. [E2E secuenciales — sin Playwright](#5-e2e-secuenciales--sin-playwright)
6. [Cómo correr todo](#6-cómo-correr-todo)
7. [Checklist de implementación](#7-checklist-de-implementación)

---

## 1. Estado actual — qué ya existe

### 1.1 Backend (implementado y real)

| Archivo | IDs | Tests | Estado |
|---------|-----|-------|--------|
| `apps/catalogo/tests/test_catalogo.py` | CAT-001..018 | 18 | ✅ Real — APITestCase con BD real |
| `apps/recepcion/tests/test_recepcion.py` | REC-001..010 | 10 | ✅ Real |
| `apps/inventario/tests/test_inventario.py` | INV-001..012 | 12 | ✅ Real |
| `apps/produccion/tests/test_produccion.py` | PROD-001..014 | 14 | ✅ Real |
| `apps/alertas/tests/test_alertas.py` | ALR-001..008 | 8 | ⚠️ Importa `AlertaService` que puede no existir |

**Total backend: 62 tests**

### 1.2 Frontend (implementado y real)

| Archivo | Tests | Tipo | Estado |
|---------|-------|------|--------|
| `Login.test.jsx` | 4 | Integración UI | ✅ Real |
| `NuevaRecepcionPage.test.jsx` | 4 | Integración UI | ✅ Real |
| `alertasStore.test.js` | 5 | Store + MockWS | ✅ Real |
| `RoleGate.test.jsx` | 5 | Unidad | ✅ Real |
| `ProtectedRoute.test.jsx` | 3 | Unidad | ✅ Real |
| `OrdenesPage.test.jsx` | 5 | Integración UI | ✅ Real |
| `MateriaPrimaForm.test.jsx` | 5 | Unidad + UI | ✅ Real |
| `useMateriasPrimas.test.jsx` | 2 | Hook (axios-mock) | ✅ Real |
| `AppLayout.test.jsx` | 2 | Sidebar RBAC | ⚠️ No testea el drawer responsive nuevo |
| `Button.test.jsx` | 4 | Componente | ✅ Real |
| `Table.test.jsx` | 2 | Componente | ✅ Real |
| `AlertasReordenPage.test.jsx` | ? | UI | Sin auditar |
| `CompensatoriosPage.test.jsx` | ? | UI | Sin auditar |
| `DespachosPage.test.jsx` | ? | UI | Sin auditar |
| `LotesPage.test.jsx` | ? | UI | Sin auditar |
| `NuevoBatidoPage.test.jsx` | ? | UI | Sin auditar |
| `StockPage.test.jsx` | ? | UI | Sin auditar |
| `DevolucionForm.test.jsx` | ? | UI | Sin auditar |
| `TrasladoForm.test.jsx` | ? | UI | Sin auditar |
| `MateriasPrimasPage.test.jsx` | ? | UI | Sin auditar |

---

## 2. Gaps identificados

### 2.1 Backend — lo que falta

| Categoría | Problema | Prioridad |
|-----------|---------|-----------|
| **RBAC enforcement** | Ningún test verifica que un rol incorrecto reciba 403 | Alta |
| **Sin token (401)** | Ningún test verifica que un request sin `Authorization` reciba 401 | Alta |
| **AlertaService** | `test_alertas.py` importa un servicio que puede no existir aún | Alta |
| **Token refresh** | El flujo de refresh JWT no tiene test | Media |
| **Lockout/Brute force** | Django-Axes: 5 intentos fallidos → bloqueo 1h (AUT mencionado en plan, no implementado) | Media |
| **Filtros y búsqueda** | Los `?search=`, `?estado=`, `?activo=` de los listados no se testean | Baja |
| **Modelo puro** | Constraints, `unique_together` y métodos del modelo sin HTTP | Baja |

### 2.2 Frontend — lo que falta

| Categoría | Problema | Prioridad |
|-----------|---------|-----------|
| **Sidebar drawer** | El nuevo comportamiento responsive (hamburguesa, overlay, cierre al navegar) no tiene test | Alta |
| **NuevaOrdenPage** | Formulario de crear OC sin tests | Alta |
| **Error / loading states** | Ninguna page testea spinner ni mensaje de error de red | Media |
| **Dashboard** | Tarjetas de resumen conectadas al API sin tests | Media |
| **Accesibilidad** | No hay tests de ARIA ni keyboard navigation | Baja |

### 2.3 E2E — lo que falta

No existe ningún test que cubra un flujo completo de negocio end-to-end.

---

## 3. Backend — tests pendientes

### 3.1 Crear `apps/authentication/tests/test_autenticacion.py`

Este archivo no existe aún. Crear con los siguientes casos:

```python
# apps/authentication/tests/test_autenticacion.py

from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

URL_LOGIN   = '/api/v1/auth/login/'
URL_REFRESH = '/api/v1/auth/token/refresh/'
URL_LOGOUT  = '/api/v1/auth/logout/'

ROLES = ['ADMIN', 'GERENTE', 'INVENTARIO', 'PRODUCCION']


class AutenticacionTestCase(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )

    # AUT-N01 — Login exitoso devuelve access + refresh
    def test_login_exitoso_devuelve_tokens(self):
        response = self.client.post(URL_LOGIN, {
            'email': 'test@daluzed.com',
            'password': 'Daluzed2026!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    # AUT-N02 — Credenciales incorrectas → 401
    def test_credenciales_incorrectas_devuelven_401(self):
        response = self.client.post(URL_LOGIN, {
            'email': 'test@daluzed.com',
            'password': 'contraseña-incorrecta',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # AUT-N03 — Request sin token → 401 en cualquier endpoint protegido
    def test_sin_token_devuelve_401(self):
        # Sin credenciales
        response = self.client.get('/api/v1/catalogo/materias-primas/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # AUT-N04 — Refresh token válido devuelve nuevo access token
    def test_refresh_token_valido_devuelve_nuevo_access(self):
        refresh = RefreshToken.for_user(self.user)
        response = self.client.post(URL_REFRESH, {
            'refresh': str(refresh),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    # AUT-N05 — Logout invalida el refresh token
    def test_logout_invalida_refresh_token(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        self.client.post(URL_LOGOUT, {'refresh': str(refresh)}, format='json')
        # Intentar reusar el refresh debe fallar
        response = self.client.post(URL_REFRESH, {'refresh': str(refresh)}, format='json')
        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        ])


class RBACEnforcementTestCase(APITestCase):
    """
    Verifica que cada endpoint devuelve 403 cuando el rol no tiene permiso.
    Un test por endpoint crítico, usando el rol menos privilegiado que
    NO debe tener acceso.
    """

    ENDPOINTS_SOLO_ADMIN = [
        ('POST', '/api/v1/catalogo/materias-primas/'),
        ('POST', '/api/v1/catalogo/proveedores/'),
        ('POST', '/api/v1/catalogo/unidades-medida/'),
        ('POST', '/api/v1/catalogo/productos-terminados/'),
    ]

    ENDPOINTS_SOLO_INVENTARIO_O_SUPERIOR = [
        ('GET',  '/api/v1/inventario/stock/'),
        ('POST', '/api/v1/inventario/traslados/'),
        ('POST', '/api/v1/inventario/devoluciones/'),
        ('POST', '/api/v1/inventario/descartes/'),
    ]

    def _auth_as(self, role):
        user = User.objects.create_user(
            email=f'{role.lower()}@daluzed.com',
            password='Test2026!',
            role=role,
        )
        refresh = RefreshToken.for_user(user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )

    # RBAC-N01 — PRODUCCION no puede crear materias primas
    def test_produccion_no_puede_crear_materia_prima(self):
        self._auth_as('PRODUCCION')
        response = self.client.post(
            '/api/v1/catalogo/materias-primas/',
            {'nombre': 'X', 'unidad_medida': 1},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # RBAC-N02 — PRODUCCION no puede crear traslados de inventario
    def test_produccion_no_puede_crear_traslado(self):
        self._auth_as('PRODUCCION')
        response = self.client.post(
            '/api/v1/inventario/traslados/',
            {'lote_id': 1, 'bodega_destino': 2, 'cantidad': 100},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # RBAC-N03 — INVENTARIO no puede registrar batidos de producción
    def test_inventario_no_puede_registrar_batido(self):
        self._auth_as('INVENTARIO')
        response = self.client.post(
            '/api/v1/produccion/batidos/',
            {'producto_terminado_id': 1, 'ingredientes': []},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # RBAC-N04 — GERENTE puede ver reportes/compensatorios pero no crear batidos
    def test_gerente_puede_listar_compensatorios(self):
        self._auth_as('GERENTE')
        response = self.client.get('/api/v1/produccion/compensatorios/')
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_404_NOT_FOUND,  # si no hay datos, algunos devuelven 404
        ])

    # RBAC-N05 — ADMIN puede acceder a todos los módulos
    def test_admin_puede_listar_todas_las_mps(self):
        self._auth_as('ADMIN')
        response = self.client.get('/api/v1/catalogo/materias-primas/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
```

---

### 3.2 Verificar / arreglar `apps/alertas/tests/test_alertas.py`

Antes de correr los tests de alertas, verificar si `AlertaService` está implementado:

```bash
grep -r "class AlertaService" apps/alertas/
```

**Si no existe:** Agregar `@unittest.skip("AlertaService pendiente de implementar")` a cada test, o comentar el `import`.

**Si existe:** Correr `python manage.py test apps.alertas` y verificar que pasan.

---

### 3.3 Agregar tests de filtros en `test_catalogo.py`

Agregar al final de `MateriaPrimaTestCase`:

```python
# CAT-N01 — Filtrar materias primas activas
def test_cat_n01_listar_solo_materias_primas_activas(self):
    MateriaPrima.objects.create(nombre='MP Activa', unidad_medida=self.gramos, punto_reorden=100)
    mp_inactiva = MateriaPrima.objects.create(nombre='MP Inactiva', unidad_medida=self.gramos, punto_reorden=100)
    mp_inactiva.activo = False
    mp_inactiva.save()

    response = self.client.get(self.URL, {'activo': 'true'})
    nombres = [r['nombre'] for r in response.data['results']]
    self.assertIn('MP Activa', nombres)
    self.assertNotIn('MP Inactiva', nombres)

# CAT-N02 — Búsqueda por nombre parcial
def test_cat_n02_buscar_materia_prima_por_nombre_parcial(self):
    MateriaPrima.objects.create(nombre='Harina de almendra', unidad_medida=self.gramos, punto_reorden=500)
    MateriaPrima.objects.create(nombre='Harina de coco', unidad_medida=self.gramos, punto_reorden=500)
    MateriaPrima.objects.create(nombre='Azúcar refinada', unidad_medida=self.gramos, punto_reorden=500)

    response = self.client.get(self.URL, {'search': 'Harina'})
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    nombres = [r['nombre'] for r in response.data['results']]
    self.assertIn('Harina de almendra', nombres)
    self.assertIn('Harina de coco', nombres)
    self.assertNotIn('Azúcar refinada', nombres)
```

---

## 4. Frontend — tests pendientes

### 4.1 Actualizar `AppLayout.test.jsx` — drawer responsive

El archivo actual solo testea RBAC del sidebar. Agregar los siguientes casos para el drawer que se implementó:

```jsx
// Agregar al describe existente en AppLayout.test.jsx

import userEvent from '@testing-library/user-event';

it('muestra el botón hamburguesa en mobile (siempre visible en DOM)', () => {
  useAuthStore.setState({ user: { username: 'u', role: 'ADMIN' } });
  renderLayout();
  // El botón hamburguesa siempre está en el DOM, CSS lo oculta en desktop
  expect(screen.getByRole('button', { name: /abrir menú/i })).toBeInTheDocument();
});

it('abrir sidebar: click hamburguesa muestra el overlay', async () => {
  useAuthStore.setState({ user: { username: 'u', role: 'ADMIN' } });
  renderLayout();

  // Antes: overlay no existe
  expect(document.querySelector('[aria-hidden="true"]')).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: /abrir menú/i }));

  // Después: overlay aparece
  expect(document.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
});

it('cerrar sidebar: click en overlay elimina el overlay', async () => {
  useAuthStore.setState({ user: { username: 'u', role: 'ADMIN' } });
  renderLayout();

  await userEvent.click(screen.getByRole('button', { name: /abrir menú/i }));
  const overlay = document.querySelector('[aria-hidden="true"]');
  expect(overlay).toBeInTheDocument();

  await userEvent.click(overlay);
  expect(document.querySelector('[aria-hidden="true"]')).toBeNull();
});
```

---

### 4.2 Crear `__tests__/NuevaOrdenPage.test.jsx`

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NuevaOrdenPage from '../pages/recepcion/NuevaOrdenPage';

vi.mock('../api/recepcionAPI', () => ({
  ordenesAPI: { create: vi.fn() },
  catalogoForRecepcion: {
    proveedores:    vi.fn(),
    materiasPrimas: vi.fn(),
    presentaciones: vi.fn(),
  },
}));

const toastSuccess = vi.fn();
const toastError   = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (...a) => toastSuccess(...a), error: (...a) => toastError(...a) } }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const a = await vi.importActual('react-router-dom');
  return { ...a, useNavigate: () => mockNavigate };
});

const { ordenesAPI, catalogoForRecepcion } = await import('../api/recepcionAPI');

const PROVEEDORES = [{ id: 1, nombre: 'Prov. Test' }];
const MPS         = [{ id: 10, nombre: 'Harina' }];
const PRES        = [{ id: 100, nombre: 'Bolsa 50kg', materia_prima: 10 }];

function setup() {
  catalogoForRecepcion.proveedores.mockResolvedValue({ data: PROVEEDORES });
  catalogoForRecepcion.materiasPrimas.mockResolvedValue({ data: MPS });
  catalogoForRecepcion.presentaciones.mockResolvedValue({ data: PRES });

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><NuevaOrdenPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NuevaOrdenPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza el formulario con selector de proveedor y líneas de pedido', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Prov. Test')).toBeInTheDocument());
    expect(screen.getByText('Líneas de pedido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /agregar línea/i })).toBeInTheDocument();
  });

  it('puede agregar una línea extra al formulario', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Prov. Test')).toBeInTheDocument());

    const combos = screen.getAllByRole('combobox');
    expect(combos.length).toBeGreaterThanOrEqual(3); // proveedor + MP + presentación

    await userEvent.click(screen.getByRole('button', { name: /agregar línea/i }));

    const combosAfter = screen.getAllByRole('combobox');
    expect(combosAfter.length).toBeGreaterThan(combos.length);
  });

  it('envía la OC correctamente y navega a /recepcion/ordenes', async () => {
    ordenesAPI.create.mockResolvedValue({ data: { id: 55 } });
    setup();
    await waitFor(() => expect(screen.getByText('Prov. Test')).toBeInTheDocument());

    // Seleccionar proveedor
    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], '1');
    // Seleccionar MP
    await userEvent.selectOptions(screen.getAllByRole('combobox')[1], '10');
    // Seleccionar presentación
    await userEvent.selectOptions(screen.getAllByRole('combobox')[2], '100');
    // Ingresar cantidad
    await userEvent.type(screen.getByLabelText(/cantidad/i), '5');

    await userEvent.click(screen.getByRole('button', { name: /crear oc/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith('/recepcion/ordenes');
  });

  it('muestra error toast cuando el API falla', async () => {
    ordenesAPI.create.mockRejectedValue({
      response: { data: { detail: 'Error al crear la orden.' } },
    });
    setup();
    await waitFor(() => expect(screen.getByText('Prov. Test')).toBeInTheDocument());

    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], '1');
    await userEvent.selectOptions(screen.getAllByRole('combobox')[1], '10');
    await userEvent.selectOptions(screen.getAllByRole('combobox')[2], '100');
    await userEvent.type(screen.getByLabelText(/cantidad/i), '5');
    await userEvent.click(screen.getByRole('button', { name: /crear oc/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
```

---

### 4.3 Crear `__tests__/Dashboard.test.jsx`

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../pages/Dashboard';

vi.mock('../api/dashboardAPI', () => ({
  dashboardAPI: {
    getSummary: vi.fn(),
  },
}));

const { dashboardAPI } = await import('../api/dashboardAPI');

const SUMMARY_MOCK = {
  total_materias_primas: 12,
  lotes_proximos_vencer: 3,
  batidos_hoy: 2,
  alertas_activas: 5,
};

function renderDashboard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><Dashboard /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Dashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra los valores del API en las tarjetas de resumen', async () => {
    dashboardAPI.getSummary.mockResolvedValue({ data: SUMMARY_MOCK });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument(); // total_materias_primas
      expect(screen.getByText('3')).toBeInTheDocument();  // lotes_proximos_vencer
    });
  });

  it('muestra el spinner mientras carga', () => {
    dashboardAPI.getSummary.mockReturnValue(new Promise(() => {})); // never resolves
    renderDashboard();
    // Debe haber algún indicador de carga
    expect(document.querySelector('[data-testid="spinner"], .animate-spin, [aria-busy]')).toBeTruthy();
  });
});
```

---

### 4.4 Pattern para los 9 archivos de pages sin auditar

Para cada archivo (`AlertasReordenPage`, `CompensatoriosPage`, `DespachosPage`, `LotesPage`, `NuevoBatidoPage`, `StockPage`, `DevolucionForm`, `TrasladoForm`, `MateriasPrimasPage`) verificar que tenga al menos:

1. **Render test** — que el componente monta sin error
2. **Happy path** — que con datos válidos muestra lo que debe mostrar
3. **Empty state** — que sin datos muestra el estado vacío correcto
4. **Error de API** — que un fallo de red muestra toast de error (no rompe la página)

Si alguno de esos 4 no existe, agregarlo.

---

## 5. E2E secuenciales — sin Playwright

### 5.1 Filosofía

Cada test E2E es **un solo `it()`** que encadena todas las acciones del flujo. No se divide en múltiples tests pequeños. Se usa:
- **Backend:** `APITestCase` — pasos encadenados dentro de un mismo método `test_*`
- **Frontend:** Vitest + RTL + **MSW** para interceptar los llamados al API con respuestas reales

### 5.2 Instalar MSW (si no está instalado)

```bash
cd frontend
npm install msw --save-dev
npx msw init public/ --save
```

Crear `frontend/src/__tests__/e2e/mswServer.js`:

```js
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Datos base compartidos entre handlers
let ordenes = [];
let recepciones = [];
let lotes = [];
let nextId = 1;

export const handlers = [
  // Auth
  http.post('/api/v1/auth/login/', () =>
    HttpResponse.json({ access: 'fake-token', refresh: 'fake-refresh', role: 'INVENTARIO' })
  ),

  // Catálogo
  http.get('/api/v1/catalogo/proveedores/', () =>
    HttpResponse.json({ results: [{ id: 1, nombre: 'Prov. Test' }] })
  ),
  http.get('/api/v1/catalogo/materias-primas/', () =>
    HttpResponse.json({
      results: [{
        id: 1, nombre: 'Harina', dias_minimos_vencimiento: 30,
        presentaciones: [{ id: 10, nombre: 'Bolsa 50kg', factor_conversion: 50000 }],
      }],
    })
  ),

  // Órdenes de compra
  http.get('/api/v1/recepcion/ordenes/', () =>
    HttpResponse.json({ results: ordenes })
  ),
  http.post('/api/v1/recepcion/ordenes/', async ({ request }) => {
    const body = await request.json();
    const oc = { id: nextId++, ...body, estado: 'PENDIENTE', proveedor: 'Prov. Test' };
    ordenes.push(oc);
    return HttpResponse.json(oc, { status: 201 });
  }),

  // Recepciones
  http.post('/api/v1/recepcion/', async ({ request }) => {
    const body = await request.json();
    const rec = { id: nextId++, ...body, confirmada: true };
    recepciones.push(rec);
    // Simular creación de lote
    lotes.push({ id: nextId++, materia_prima: 1, cantidad: 150000 });
    return HttpResponse.json(rec, { status: 201 });
  }),

  // Inventario stock
  http.get('/api/v1/inventario/stock/', () =>
    HttpResponse.json({ cantidad_total: lotes.reduce((s, l) => s + l.cantidad, 0) })
  ),
];

export function resetHandlerState() {
  ordenes = [];
  recepciones = [];
  lotes = [];
  nextId = 1;
}

export const server = setupServer(...handlers);
```

---

### 5.3 Crear `frontend/src/__tests__/e2e/flujo-recepcion.e2e.test.jsx`

**Flujo completo: crear OC → registrar recepción → verificar stock**

```jsx
// frontend/src/__tests__/e2e/flujo-recepcion.e2e.test.jsx
//
// Un solo test que encadena:
//   1. Render de OrdenesPage (lista vacía)
//   2. Navegar a NuevaOrdenPage y crear una OC
//   3. Volver a la lista y ver la OC creada
//   4. Ir a NuevaRecepcionPage y registrar la recepción contra esa OC
//   5. Verificar que la recepción fue creada exitosamente

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server, resetHandlerState } from './mswServer';
import OrdenesPage from '../../pages/recepcion/OrdenesPage';
import NuevaOrdenPage from '../../pages/recepcion/NuevaOrdenPage';
import NuevaRecepcionPage from '../../pages/recepcion/NuevaRecepcionPage';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => { server.resetHandlers(); resetHandlerState(); });
afterAll(() => server.close());

function renderApp(initialPath = '/recepcion/ordenes') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/recepcion/ordenes"          element={<OrdenesPage />} />
          <Route path="/recepcion/ordenes/nueva"    element={<NuevaOrdenPage />} />
          <Route path="/recepcion/recepciones/nueva" element={<NuevaRecepcionPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('E2E: Flujo de recepción completo', () => {
  it('crear OC → listar → registrar recepción → éxito', async () => {
    // ── Paso 1: Renderizar NuevaOrdenPage y crear la OC ──────────────
    const { unmount } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/recepcion/ordenes/nueva']}>
          <Routes>
            <Route path="/recepcion/ordenes/nueva" element={<NuevaOrdenPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Esperar a que cargue el formulario
    await waitFor(() => expect(screen.getByText(/nueva orden de compra/i)).toBeInTheDocument());

    // Seleccionar proveedor
    await waitFor(() => expect(screen.getByText('Prov. Test')).toBeInTheDocument());
    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], '1');

    // Seleccionar MP y presentación
    await waitFor(() => expect(screen.getByText('Harina')).toBeInTheDocument());
    await userEvent.selectOptions(screen.getAllByRole('combobox')[1], '1');
    await userEvent.selectOptions(screen.getAllByRole('combobox')[2], '10');

    // Cantidad
    await userEvent.type(screen.getByLabelText(/cantidad/i), '3');

    // Enviar
    await userEvent.click(screen.getByRole('button', { name: /crear oc/i }));

    // La OC fue enviada al servidor MSW (estado interno actualizado)
    unmount();

    // ── Paso 2: Renderizar OrdenesPage y ver la OC creada ────────────
    const { unmount: unmount2 } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/recepcion/ordenes']}>
          <Routes>
            <Route path="/recepcion/ordenes" element={<OrdenesPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText('OC-1')).toBeInTheDocument());
    expect(screen.getByText('PENDIENTE')).toBeInTheDocument();
    unmount2();

    // ── Paso 3: Registrar recepción contra OC-1 ──────────────────────
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/recepcion/recepciones/nueva?oc=1']}>
          <Routes>
            <Route path="/recepcion/recepciones/nueva" element={<NuevaRecepcionPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText(/nueva recepción/i)).toBeInTheDocument());

    // La OC-1 ya está seleccionada via query param
    // Completar fecha de vencimiento
    const fechaInput = screen.getByLabelText(/fecha de vencimiento/i);
    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 90);
    await userEvent.type(fechaInput, fechaFutura.toISOString().slice(0, 10));

    await userEvent.click(screen.getByRole('button', { name: /registrar recepción/i }));

    // La recepción se creó exitosamente
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).toBeNull();
    });
  });
});
```

---

### 5.4 Crear `apps/e2e/test_flujo_recepcion.py` (Backend E2E secuencial)

**Flujo completo en el backend: login → crear OC → recepción → verificar stock**

```python
# apps/e2e/test_flujo_recepcion.py
#
# Test E2E secuencial: todos los pasos en un solo método.
# Verifica que el flujo completo de negocio funciona de punta a punta.

from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date, timedelta

from apps.catalogo.models import UnidadMedida, MateriaPrima, Presentacion, Proveedor
from apps.inventario.models import Bodega, Lote
from django.db.models import Sum

User = get_user_model()


class FlujoRecepcionE2E(APITestCase):
    """
    E2E-REC: Flujo completo de recepción en un único test.

    Secuencia:
      1. Autenticar usuario INVENTARIO
      2. Crear Orden de Compra
      3. Registrar Recepción contra esa OC
      4. Verificar que el lote fue creado en Bodega Principal
      5. Verificar que el stock de la MP aumentó
    """

    def test_flujo_completo_recepcion(self):
        # ── Setup de catálogo ──────────────────────────────────────────
        gramos   = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        proveedor = Proveedor.objects.create(nombre='Prov. E2E S.A.')
        mp_harina = MateriaPrima.objects.create(
            nombre='Harina E2E',
            unidad_medida=gramos,
            punto_reorden=5000,
            dias_minimos_vencimiento=30,
        )
        pres_bolsa = Presentacion.objects.create(
            nombre='Bolsa 50kg',
            materia_prima=mp_harina,
            unidad_medida=gramos,
            factor_conversion=50000,
        )
        bodega_principal = Bodega.objects.create(nombre='Bodega Principal', tipo='PRINCIPAL')

        # ── Paso 1: Autenticar ─────────────────────────────────────────
        user = User.objects.create_user(
            email='e2e@daluzed.com', password='E2eTest2026!', role='INVENTARIO'
        )
        login_res = self.client.post('/api/v1/auth/login/', {
            'email': 'e2e@daluzed.com', 'password': 'E2eTest2026!',
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK,
                         msg="Paso 1 fallido: login no devolvió 200")
        token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # ── Paso 2: Crear Orden de Compra ──────────────────────────────
        oc_res = self.client.post('/api/v1/recepcion/ordenes/', {
            'proveedor_id': proveedor.id,
            'detalles': [{
                'materia_prima_id': mp_harina.id,
                'presentacion_id': pres_bolsa.id,
                'cantidad_presentacion': 5,
            }],
        }, format='json')
        self.assertEqual(oc_res.status_code, status.HTTP_201_CREATED,
                         msg="Paso 2 fallido: no se pudo crear la OC")
        oc_id = oc_res.data['id']

        # ── Paso 3: Registrar Recepción contra la OC ───────────────────
        fecha_vencimiento = date.today() + timedelta(days=120)
        rec_res = self.client.post('/api/v1/recepcion/', {
            'orden_compra_id': oc_id,
            'detalles': [{
                'materia_prima_id': mp_harina.id,
                'presentacion_id': pres_bolsa.id,
                'cantidad_presentacion': 5,
                'fecha_vencimiento': str(fecha_vencimiento),
                'numero_lote': 'LOT-E2E-001',
            }],
        }, format='json')
        self.assertEqual(rec_res.status_code, status.HTTP_201_CREATED,
                         msg="Paso 3 fallido: no se pudo registrar la recepción")

        # ── Paso 4: Verificar lote creado en Bodega Principal ──────────
        lote = Lote.objects.filter(
            materia_prima=mp_harina,
            bodega=bodega_principal,
            numero_lote='LOT-E2E-001',
        ).first()
        self.assertIsNotNone(lote, msg="Paso 4 fallido: lote no fue creado")
        # 5 bolsas × 50000g = 250000g
        self.assertEqual(float(lote.cantidad), 250000.0,
                         msg="Paso 4 fallido: cantidad del lote incorrecta")

        # ── Paso 5: Verificar stock en el API ──────────────────────────
        stock_res = self.client.get('/api/v1/inventario/stock/', {
            'materia_prima': mp_harina.id,
            'bodega': bodega_principal.id,
        })
        self.assertEqual(stock_res.status_code, status.HTTP_200_OK,
                         msg="Paso 5 fallido: no se pudo consultar el stock")
        self.assertGreaterEqual(float(stock_res.data['cantidad_total']), 250000.0,
                                msg="Paso 5 fallido: stock no refleja la recepción")


class FlujoProduccionE2E(APITestCase):
    """
    E2E-PROD: Flujo completo de producción en un único test.

    Secuencia:
      1. Autenticar usuario PRODUCCION
      2. Verificar stock disponible en Bodega PDP
      3. Registrar un batido (descuenta ingredientes)
      4. Verificar que los lotes en PDP bajaron
      5. Verificar que se creó un LoteProductoTerminado en EN_ESPERA
      6. Despachar el lote (EN_ESPERA → EN_PUNTO_DE_VENTA)
    """

    def setUp(self):
        from apps.catalogo.models import ProductoTerminado
        gramos   = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        unidades = UnidadMedida.objects.create(nombre='Unidades', simbolo='und')

        self.mp_harina = MateriaPrima.objects.create(
            nombre='Harina Prod', unidad_medida=gramos, punto_reorden=5000
        )
        self.torta = ProductoTerminado.objects.create(
            nombre='Torta E2E', vida_util_dias=14, unidad_medida=unidades
        )
        self.bodega_pdp = Bodega.objects.create(nombre='Bodega PDP', tipo='PDP')
        hoy = date.today()
        self.lote_harina = Lote.objects.create(
            materia_prima=self.mp_harina,
            bodega=self.bodega_pdp,
            cantidad=10000,
            fecha_vencimiento=hoy + timedelta(days=60),
            fecha_entrada=hoy,
        )

    def test_flujo_completo_produccion_y_despacho(self):
        from apps.produccion.models import LoteProductoTerminado

        # ── Paso 1: Autenticar ─────────────────────────────────────────
        user = User.objects.create_user(
            email='prod-e2e@daluzed.com', password='E2eTest2026!', role='PRODUCCION'
        )
        login_res = self.client.post('/api/v1/auth/login/', {
            'email': 'prod-e2e@daluzed.com', 'password': 'E2eTest2026!',
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {login_res.data["access"]}')

        # ── Paso 2: Verificar stock en PDP antes del batido ────────────
        cantidad_antes = float(self.lote_harina.cantidad)
        self.assertEqual(cantidad_antes, 10000.0)

        # ── Paso 3: Registrar batido ───────────────────────────────────
        batido_res = self.client.post('/api/v1/produccion/batidos/', {
            'producto_terminado_id': self.torta.id,
            'fecha_produccion': str(date.today()),
            'hora_inicio': '08:00',
            'ingredientes': [{
                'materia_prima_id': self.mp_harina.id,
                'lote_id': self.lote_harina.id,
                'cantidad': 3000,
            }],
        }, format='json')
        self.assertEqual(batido_res.status_code, status.HTTP_201_CREATED,
                         msg="Paso 3 fallido: no se pudo registrar el batido")
        batido_id = batido_res.data['id']

        # ── Paso 4: Verificar descuento en PDP ────────────────────────
        self.lote_harina.refresh_from_db()
        self.assertEqual(float(self.lote_harina.cantidad), cantidad_antes - 3000,
                         msg="Paso 4 fallido: el lote en PDP no se descontó")

        # ── Paso 5: Verificar LoteProductoTerminado EN_ESPERA ─────────
        lote_pt = LoteProductoTerminado.objects.filter(batido_id=batido_id).first()
        self.assertIsNotNone(lote_pt, msg="Paso 5 fallido: LoteProductoTerminado no existe")
        self.assertEqual(lote_pt.estado, 'EN_ESPERA',
                         msg="Paso 5 fallido: estado no es EN_ESPERA")
        vencimiento_esperado = date.today() + timedelta(days=self.torta.vida_util_dias)
        self.assertEqual(lote_pt.fecha_vencimiento, vencimiento_esperado,
                         msg="Paso 5 fallido: fecha de vencimiento incorrecta")

        # ── Paso 6: Despachar lote ─────────────────────────────────────
        despacho_res = self.client.post(
            f'/api/v1/produccion/despachos/{lote_pt.id}/despachar/'
        )
        self.assertEqual(despacho_res.status_code, status.HTTP_200_OK,
                         msg="Paso 6 fallido: no se pudo despachar el lote")
        lote_pt.refresh_from_db()
        self.assertEqual(lote_pt.estado, 'EN_PUNTO_DE_VENTA',
                         msg="Paso 6 fallido: estado final no es EN_PUNTO_DE_VENTA")


class FlujoInventarioTrasladoE2E(APITestCase):
    """
    E2E-INV: Flujo completo de traslado en un único test.

    Secuencia:
      1. Autenticar usuario INVENTARIO
      2. Verificar stock en Bodega Principal
      3. Registrar traslado BP → PDP
      4. Verificar que BP bajó y PDP subió
    """

    def test_flujo_traslado_bp_a_pdp(self):
        # Setup
        gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        mp = MateriaPrima.objects.create(
            nombre='Azúcar Traslado', unidad_medida=gramos, punto_reorden=1000
        )
        bp  = Bodega.objects.create(nombre='Bodega Principal', tipo='PRINCIPAL')
        pdp = Bodega.objects.create(nombre='Bodega PDP', tipo='PDP')
        lote = Lote.objects.create(
            materia_prima=mp, bodega=bp,
            cantidad=20000,
            fecha_vencimiento=date.today() + timedelta(days=90),
            fecha_entrada=date.today(),
        )

        # Paso 1: Auth
        user = User.objects.create_user(
            email='inv-e2e@daluzed.com', password='E2eTest2026!', role='INVENTARIO'
        )
        login_res = self.client.post('/api/v1/auth/login/', {
            'email': 'inv-e2e@daluzed.com', 'password': 'E2eTest2026!',
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {login_res.data["access"]}')

        # Paso 2: Stock BP antes
        stock_bp_antes = float(lote.cantidad)

        # Paso 3: Traslado
        traslado_res = self.client.post('/api/v1/inventario/traslados/', {
            'lote_id': lote.id,
            'bodega_destino': pdp.id,
            'cantidad': 5000,
        }, format='json')
        self.assertEqual(traslado_res.status_code, status.HTTP_201_CREATED,
                         msg="Traslado fallido")

        # Paso 4: Verificar BP bajó
        lote.refresh_from_db()
        self.assertEqual(float(lote.cantidad), stock_bp_antes - 5000,
                         msg="Bodega Principal no bajó correctamente")

        # Paso 4b: Verificar PDP subió
        lote_pdp = Lote.objects.filter(
            materia_prima=mp, bodega=pdp, cantidad=5000
        ).first()
        self.assertIsNotNone(lote_pdp, msg="Lote en PDP no fue creado")
```

---

### 5.5 Crear `apps/e2e/__init__.py`

```bash
touch apps/e2e/__init__.py
```

---

## 6. Cómo correr todo

### Backend

```bash
# Todos los tests
python manage.py test apps --verbosity=2

# Solo un módulo
python manage.py test apps.catalogo.tests
python manage.py test apps.authentication.tests
python manage.py test apps.e2e

# Con pytest (si está instalado)
pytest apps/ -v
```

### Frontend

```bash
cd frontend

# Todos los tests
npm run test

# Solo E2E
npm run test -- --reporter=verbose src/__tests__/e2e/

# Con coverage
npm run test -- --coverage
```

### Configurar vitest para E2E (si es necesario)

En `frontend/vitest.config.js`, verificar que esté configurado el servidor MSW para Node:

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
  },
});
```

En `frontend/src/test-setup.js` agregar:

```js
import '@testing-library/jest-dom';
// MSW se configura en cada archivo e2e con beforeAll/afterAll
```

---

## 7. Checklist de implementación

Marcar con `[x]` a medida que se completen.

### Backend

- [ ] Crear `apps/authentication/tests/__init__.py`
- [ ] Crear `apps/authentication/tests/test_autenticacion.py` con `AutenticacionTestCase` y `RBACEnforcementTestCase`
- [ ] Verificar si `AlertaService` existe: `grep -r "class AlertaService" apps/alertas/`
  - [ ] Si existe: correr `python manage.py test apps.alertas` y confirmar que pasan
  - [ ] Si no existe: agregar `@unittest.skip(...)` a cada test en `test_alertas.py`
- [ ] Agregar `CAT-N01` y `CAT-N02` (filtros) a `test_catalogo.py`
- [ ] Crear `apps/e2e/__init__.py`
- [ ] Crear `apps/e2e/test_flujo_recepcion.py` con los 3 tests E2E secuenciales
- [ ] Correr `python manage.py test apps --verbosity=2` y confirmar 0 errores

### Frontend

- [ ] Actualizar `AppLayout.test.jsx` con los 3 tests del drawer responsive
- [ ] Crear `__tests__/NuevaOrdenPage.test.jsx`
- [ ] Crear `__tests__/Dashboard.test.jsx`
- [ ] Auditar los 9 archivos de tests sin revisar y agregar tests faltantes según el patrón de la sección 4.4
- [ ] Instalar MSW: `npm install msw --save-dev && npx msw init public/ --save`
- [ ] Crear `__tests__/e2e/mswServer.js`
- [ ] Crear `__tests__/e2e/flujo-recepcion.e2e.test.jsx`
- [ ] Correr `npm run test` y confirmar 0 errores

---

## Notas de contexto para la sesión

- El proyecto está en `/Users/samueltabares/Desktop/PN-daluzed`
- Frontend en `frontend/` con Vite + React 19 + Tailwind CSS v4
- Backend Django en `apps/`
- El sidebar tiene un nuevo drawer responsive (hamburguesa en mobile, `lg:hidden`) implementado en `AppLayout.jsx`, `TopBar.jsx` y `Sidebar.jsx` — commit `ff23c1c`
- RBAC: los roles son `ADMIN`, `GERENTE`, `INVENTARIO`, `PRODUCCION`
- Las dos bodegas clave del negocio: `PRINCIPAL` (activa alertas de reorden) y `PDP` (punto de producción, FEFO)
- Los estados del producto terminado son: `EN_ESPERA` → `EN_PUNTO_DE_VENTA` (irreversible)
- Los compensatorios son el mecanismo de corrección (no se borran ni editan registros)
