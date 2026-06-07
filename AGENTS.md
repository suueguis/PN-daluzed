# AGENTS.md — Daluzed Inventario

Instrucciones del proyecto para Claude Code y cualquier editor con soporte de IA.
Aplica para Claude Code CLI, Cursor, Zed, o trabajo manual.

---

## Contexto del proyecto

**Daluzed** — Sistema de gestión de inventario para una empresa de repostería familiar.
- **Backend**: Django 4.2 + DRF + SimpleJWT + Django-Axes
- **Frontend**: React 19 + Vite + Tailwind CSS v4 + Zustand
- **Base de datos**: PostgreSQL 15 (`daluzed_db`, puerto 5432)
- **Hosting**: Railway (backend) + Vercel (frontend)
- **Materia completa evaluada**: Arquitectura SW, Pruebas, Tecnologías Web, Tendencias IS

Documentación completa del dominio: `contexto.md`
Plan de pruebas TDD (107 casos): `PLAN_DE_PRUEBAS_TDD.md`

---

## Estado actual de módulos

| Módulo | App Django | Estado | Tests |
|--------|-----------|--------|-------|
| AUT — Autenticación | `apps.authentication` | ✅ Implementado | 15 casos (AUT-001..015) |
| CAT — Catálogo Maestro | `apps.catalogo` | ✅ Implementado | 18 casos (CAT-001..018) |
| INV — Inventario | `apps.inventario` | ✅ Implementado | 12 casos (INV-001..012) |
| REC — Recepción | `apps.recepcion` | ✅ Implementado | 10 casos (REC-001..010) |
| PROD — Producción | `apps.produccion` | ✅ Implementado | 14 casos (PROD-001..014) |
| ALR — Alertas | `apps.alertas` | ✅ Implementado | 8 casos (ALR-001..008) |
| IND — Indicadores | `apps.indicadores` | ✅ Implementado | 5 casos (IND-001..005) |
| AUD — Auditoría | `apps.auditoria` | ✅ Implementado | 6 casos (AUD-001..006) |

---

## Arquitectura del backend

```
apps/
  authentication/
    models.py          ← User (email como USERNAME_FIELD, campo role, default='INVENTARIO')
                          create_superuser setea role='ADMIN' automáticamente
    services.py        ← AuthService.generate_tokens_for_user() — embeds username+role en JWT
    permissions.py     ← allow_roles(*roles) y allow_roles_rw(read, write) — factories de permiso
    api/v1/
      serializers.py   ← LoginSerializer (valida credenciales + Axes)
      views.py         ← LoginView, CookieTokenRefreshView, LogoutView,
                          CambiarContrasenaView, UserViewSet, HealthView
      urls.py
    management/commands/
      seed_demo_users.py     ← Crea un usuario por rol para pruebas
      seed_visual_data.py    ← Crea catálogo, bodegas, lotes, OC, producción y alertas de prueba
      fix_superuser_roles.py ← Actualiza superusers existentes a role='ADMIN'
    tests/
      test_autenticacion.py  ← AUT-001..015
  catalogo/        ← MateriaPrima, ProductoTerminado, Proveedor, UnidadMedida, Presentacion
  inventario/      ← Bodega, ZonaBodega, Lote, MovimientoInventario
  recepcion/       ← OrdenCompra, DetalleOrdenCompra, RecepcionMercancia (soporta PARCIAL)
  produccion/      ← Batido, DetalleBatido, LoteProductoTerminado, MovimientoCompensatorio
  alertas/
    models.py      ← Alerta, ConfiguracionAlerta (singleton de umbrales)
    services.py    ← AlertaService — evalúa stock bajo y vencimientos
    signals.py     ← post_save en Lote dispara evaluación de alertas automáticamente
    consumers.py   ← AsyncWebsocketConsumer — /ws/alertas/ (RF-ALR-05)
    routing.py     ← WebSocket URL patterns
  indicadores/     ← KpisView, UtilizacionBodegaView, ReporteSemanalView, ResumenView, ExportarView
  auditoria/
    models.py      ← BitacoraOperacion — log de operaciones críticas (LOGIN, LOGOUT, etc.)
    services.py    ← registrar_operacion(), get_client_ip() — llamados desde views de otros módulos
core/
  settings.py      ← Lee DB y SECRET_KEY desde env vars (os.environ.get)
  asgi.py          ← Django Channels ASGI — ProtocolTypeRouter con HTTP + WebSocket
  urls.py
```

**Regla de capas — nunca violar:**
- `views.py` → solo HTTP request/response, delega a services
- `services.py` → lógica de negocio pura
- `models.py` → modelos, reglas de dominio, estados
- Ninguna lógica de negocio en serializers ni en views

**Endpoints:** `/api/v1/{modulo}/{accion}/`

### Sistema de permisos — `apps/authentication/permissions.py`

Nunca usar `IsAuthenticated` directamente en endpoints de negocio. Usar las factories:

```python
# Solo lectura para ADMIN/GERENTE, escritura solo ADMIN
permission_classes = [allow_roles('ADMIN', 'GERENTE')]

# Lectura y escritura con roles distintos
permission_classes = [allow_roles_rw(read=('ADMIN', 'GERENTE', 'INVENTARIO'), write=('ADMIN',))]
```

Los superusers (`is_superuser=True`) NO tienen bypass automático — deben tener `role='ADMIN'`.
Para corregir superusers ya creados: `python manage.py fix_superuser_roles`.

### JWT y cookie de sesión

- **Access token**: 30 min, en memoria (Zustand). Se inyecta como `Authorization: Bearer` en cada request via `axiosClient.js`.
- **Refresh token**: 7 días, en cookie HttpOnly. En **desarrollo**: `SameSite=Lax`. En **producción** (`DEBUG=False`): `SameSite=None; Secure` para funcionar cross-domain (Vercel → Railway).
- Rotación activada (`ROTATE_REFRESH_TOKENS=True`) — cada refresh invalida el anterior.
- Logout blacklistea el refresh token (`rest_framework_simplejwt.token_blacklist`).
- El payload del JWT incluye `username` (email) y `role` para que el frontend los decodifique sin llamada extra.

### WebSocket — Alertas en tiempo real (RF-ALR-05)

- Servidor: Daphne (ASGI), configurado en `core/asgi.py` con `ProtocolTypeRouter`.
- Canal: `InMemoryChannelLayer` (dev y prod actual). Migrar a Redis si se escala horizontalmente.
- URL: `ws://localhost:8000/ws/alertas/` (dev) / `wss://<railway-host>/ws/alertas/` (prod).
- El frontend usa `VITE_API_URL` para construir la URL — no usa `window.location.host`.
- Las alertas se disparan automáticamente vía señal `post_save` en `Lote` → `AlertaService`.
- Formato del mensaje WebSocket: `{ "tipo": "STOCK_BAJO"|"VENCIMIENTO_PROXIMO"|"EN_ESPERA_PENDIENTE", "mensaje": "...", "alerta_id": 42 }`.

### Auditoría — `apps/auditoria`

`registrar_operacion(user, operacion, detalle_dict, ip)` se llama desde views de otros módulos para registrar en `BitacoraOperacion`. Operaciones actuales registradas: `LOGIN`, `LOGOUT`, `USUARIO_DESACTIVADO`, y operaciones de recepción/producción. Para agregar una nueva operación, importar desde `apps.auditoria.services` y llamar al final del view exitoso.

---

## Arquitectura del frontend

```
frontend/src/
  pages/
    Login.jsx                      ← Formulario de login
    Dashboard.jsx                  ← KPI cards + gráficas Recharts (ADMIN/GERENTE)
    Perfil.jsx
    catalogo/                      ← UnidadesPage, ProveedoresPage, MateriasPrimasPage,
                                      ProductosTerminadosPage, PresentacionesPage
    inventario/                    ← StockPage, LotesPage (expansión inline), BodegasPage,
                                      TrasladosPage, DevolucionesPage, DescartesPage, KardexPage
    recepcion/                     ← OrdenesPage, NuevaOrdenPage, RecepcionesPage,
                                      NuevaRecepcionPage, DetalleRecepcionPage
    produccion/                    ← ProduccionLayout (JornadaPage con toggle tabla/timeline)
    alertas/                       ← AlertasActivasPage, AlertasReordenPage,
                                      AlertasVencimientoPage, AlertasProduccionPage,
                                      ConfiguracionAletasPage
    indicadores/                   ← ReportesPage (tabla + descarga XLSX)
    admin/                         ← UsuariosPage (solo ADMIN), BitacoraPage (solo ADMIN)
  store/
    authStore.js     ← Zustand: { accessToken, user: {username, role}, isLoading }
                        Estado en memoria — no persiste en localStorage (RNF-SEG-01)
                        isLoading=true en el arranque hasta que token/refresh resuelva
    alertasStore.js  ← Zustand: WebSocket connection + lista de alertas activas
                        buildWsUrl() usa VITE_API_URL para apuntar al backend Railway
  api/
    axiosClient.js   ← Interceptores JWT: inyecta Bearer, renueva en 401 con cola de reintentos
    authAPI.js       ← loginAPI(), logoutAPI(), cambiarContrasenaAPI()
    catalogoAPI.js, inventarioAPI.js, recepcionAPI.js, produccionAPI.js,
    alertasAPI.js, indicadoresAPI.js, auditoriaAPI.js, usuariosAPI.js, zonasAPI.js
  components/
    RoleGate.jsx     ← Wrapper que renderiza hijos solo si user.role ∈ allowed[]
    ProtectedRoute.jsx
    layout/AppLayout.jsx
```

**Variable de entorno obligatoria en producción (Vercel):**
```
VITE_API_URL=https://pn-daluzed-production.up.railway.app
```
Sin esta variable el WebSocket y el refresh de token apuntan al host del frontend.

---

## Comandos de desarrollo

### Backend
```bash
python manage.py runserver          # :8000
python manage.py migrate
python manage.py makemigrations
python manage.py test apps.authentication --verbosity=2
python manage.py test apps.authentication apps.catalogo apps.inventario \
  apps.recepcion apps.produccion apps.alertas apps.indicadores apps.auditoria \
  --verbosity=2                     # todos los módulos
python manage.py check
python manage.py createsuperuser
```

### Datos de prueba
```bash
# Crea un usuario por cada rol (idempotente)
python manage.py seed_demo_users

# Crea catálogo, bodegas, lotes, OC, producción y alertas de ejemplo (idempotente)
python manage.py seed_visual_data

# Con --flush borra los datos existentes primero (excepto usuarios)
python manage.py seed_visual_data --flush

# Corrige superusers en producción que quedaron con role='INVENTARIO'
# Ejecutar en Railway después de un deploy si el superuser da 403
python manage.py fix_superuser_roles
```

### Frontend
```bash
cd frontend
npm run dev                         # :5173
npm run lint
npm run build
npm test                            # Vitest — tests unitarios y de componentes
```

### Docker (local con PostgreSQL en contenedor)
```bash
docker-compose up --build           # levanta backend + PostgreSQL en :8000
docker-compose down
```

---

## CI — GitHub Actions (`.github/workflows/ci.yml`)

El workflow corre automáticamente en cada push a `main`/`develop` y en cada PR a `main`.

### Jobs actuales
- **Backend**: PostgreSQL 15 real + migraciones + tests de **todos los módulos** + cobertura ≥ 70%
- **Frontend**: `npm ci` + lint + build + **Vitest** (tests unitarios y de componentes)

El CI ya corre tests para todos los módulos implementados. No es necesario editar el workflow al agregar un nuevo módulo — simplemente asegúrate de que los tests existan.

### Variables de entorno del CI

El CI lee las credenciales de la BD desde variables de entorno definidas en el workflow.
`settings.py` usa `os.environ.get('DB_NAME', 'daluzed_db')` con fallback a los valores locales.
Localmente no necesitas configurar nada — funciona igual que antes.

---

## Workflow de trabajo (reglas estrictas)

1. **Nunca hacer commit directo a `main`** — branch protection lo bloquea
2. **Siempre feature branch**: `git checkout -b feature/descripcion`
   - Naming: `feature/*`, `bugfix/*`, `refactor/*`, `test/*`
3. **Antes de push**: correr tests localmente y verificar que pasen
4. **Commits con formato conventional** — usar skill `/commit`:
   - `feat(cat): implementar modelo MateriaPrima`
   - `test(inv): agregar casos INV-001 a INV-006`
   - `fix(auth): corregir fallback de rol sin grupos`
5. **PR a `main`** con título descriptivo — GitHub Actions corre automáticamente
6. **No mergear sin CI verde + 1 aprobación**

---

## Convenciones de código

### Backend (Python)
- Nombres de campos en **español** (dominio del negocio)
- Type hints donde sea posible
- Docstrings en clases y métodos públicos
- Sin lógica de negocio en views ni serializers

### Frontend (JS/React)
- Componentes funcionales con hooks
- Zustand para estado global (no Context API)
- Axios con interceptores (ya configurado en `axiosClient.js`)
- Tailwind para estilos (sin CSS modules)
- Imports desde `src/pages/`: un solo nivel `../` (no `../../`)
- Logo en `public/logo.png`, referenciado como `/logo.png`

### Lo que NO hacer — decisiones ya cerradas
- No sugerir Rust, Node.js, FastAPI ni Flask
- No sugerir MongoDB ni bases de datos de grafos
- No sugerir microservicios (MVP para 10 usuarios concurrentes)
- No sugerir modo offline (cliente confirmó internet estable)
- No almacenar ni procesar recetas (secreto industrial)
- No integrar el PDV (fuera de alcance)
- No usar `attempts.failures` — el campo correcto es `attempts.failures_since_start`
- No usar Context API como alternativa a Zustand

---

## Debugging frecuente

### Django test falla
```bash
python manage.py test apps.authentication --verbosity=2
python manage.py check
# Verificar que PostgreSQL esté corriendo localmente
```

### Frontend no compila
```bash
cd frontend && npm run lint
cd frontend && npm run build
# Error de import path? Verificar que sea ../ no ../../ desde src/pages/
```

### CI falla en GitHub Actions
1. Ver el log del job fallido en la pestaña Actions del repositorio
2. Reproducir localmente con los mismos comandos del workflow
3. Pushear el fix — el CI corre nuevamente de forma automática

### DB no conecta en local
```bash
# Verificar que PostgreSQL esté corriendo
# Credenciales por defecto: daluzed_db / postgres / 1234 / localhost:5432
python manage.py check --database default
```

### En producción el usuario da 403 en endpoints de producción/alertas/indicadores
El superuser fue creado con `role='INVENTARIO'` (default anterior al fix). Corregir en Railway:
```bash
python manage.py fix_superuser_roles
```

### En producción se cierra la sesión al refrescar la página (401 en token/refresh)
1. Verificar que `DEBUG=False` en Railway — sin esto la cookie usa `SameSite=Lax` y no se envía cross-domain.
2. Verificar que `CORS_ALLOWED_ORIGINS` en Railway incluya la URL exacta de Vercel (con `https://`).
3. Verificar que `VITE_API_URL` esté seteada en Vercel apuntando al backend Railway.

### El WebSocket de alertas falla o apunta al host de Vercel
`VITE_API_URL` no está seteada en Vercel. Sin ella, `alertasStore.js` usa `window.location.host` (el frontend) en vez del backend Railway.

---

## Despliegue en producción

### Variables de entorno — Railway (backend)

| Variable | Descripción |
|----------|-------------|
| `DEBUG` | `False` — crítico para SameSite=None en la cookie |
| `DJANGO_SECRET_KEY` | Clave larga aleatoria |
| `ALLOWED_HOSTS` | Dominio de Railway, ej. `pn-daluzed-production.up.railway.app` |
| `CORS_ALLOWED_ORIGINS` | URL exacta de Vercel, ej. `https://frontend-two-chi-31.vercel.app` |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Asignados por Railway automáticamente |

### Variables de entorno — Vercel (frontend)

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL del backend Railway, ej. `https://pn-daluzed-production.up.railway.app` |

### Post-deploy en Railway (primera vez o tras reset de DB)
```bash
python manage.py migrate
python manage.py fix_superuser_roles   # si hay superuser creado antes del fix
python manage.py seed_visual_data      # opcional — datos de prueba visuales
```

### Archivos de configuración de despliegue

| Archivo | Propósito |
|---------|-----------|
| `Dockerfile` | Imagen de producción — Python 3.12, collectstatic, Daphne ASGI |
| `docker-compose.yml` | Stack local — PostgreSQL 15 + backend en un solo comando |
| `railway.json` | Configuración Railway: comando de inicio, healthcheck en `/api/v1/auth/health/`, timeout 100s |
| `frontend/vercel.json` | Configuración Vercel: rewrites para SPA routing |

---

## Referencia de archivos

| Archivo | Propósito |
|---------|-----------|
| `AGENTS.md` | Este archivo — instrucciones para el CLI |
| `contexto.md` | Contexto completo del cliente y decisiones técnicas |
| `PLAN_DE_PRUEBAS_TDD.md` | 107 casos de prueba con código completo |
| `.claude/settings.json` | Permisos y configuración del CLI |
| `.github/workflows/ci.yml` | GitHub Actions CI |
| `.github/CONTRIBUTING.md` | Guía de contribución para el equipo |
| `core/settings.py` | Configuración Django (DB, CORS, JWT, Channels desde env vars) |
| `core/asgi.py` | ASGI con Channels — HTTP + WebSocket routing |
| `requirements.txt` | Dependencias Python con versiones pinneadas |
| `apps/authentication/permissions.py` | Factories `allow_roles()` y `allow_roles_rw()` |
| `apps/authentication/management/commands/` | seed_demo_users, seed_visual_data, fix_superuser_roles |
| `apps/alertas/signals.py` | Dispara alertas automáticamente al guardar un Lote |
| `apps/auditoria/services.py` | `registrar_operacion()` — llamar desde views para bitácora |

---

**Actualizado**: Junio 2026 — Todos los módulos implementados
