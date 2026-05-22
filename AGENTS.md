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
| CAT — Catálogo Maestro | `apps.catalogo` | ⏳ Corte 1 | 18 casos (CAT-001..018) |
| INV — Inventario | `apps.inventario` | ⏳ Corte 2 | 12 casos (INV-001..012) |
| REC — Recepción | `apps.recepcion` | ⏳ Corte 2 | 10 casos (REC-001..010) |
| PROD — Producción | `apps.produccion` | ⏳ Corte 2 | 14 casos (PROD-001..014) |
| ALR — Alertas | `apps.alertas` | ⏳ Corte 3 | 8 casos (ALR-001..008) |
| IND — Indicadores | `apps.indicadores` | ⏳ Corte 3 | 5 casos (IND-001..005) |
| AUD — Auditoría | `apps.auditoria` | ⏳ Corte 3 | 6 casos (AUD-001..006) |

---

## Arquitectura del backend

```
apps/
  authentication/
    models.py          ← User con email como USERNAME_FIELD, campo role
    services.py        ← AuthService.generate_tokens_for_user()
    api/v1/
      serializers.py   ← LoginSerializer (valida credenciales + Axes)
      views.py         ← LoginView, LogoutView
      urls.py
    tests/
      test_autenticacion.py   ← AUT-001..015
core/
  settings.py          ← Lee DB y SECRET_KEY desde env vars (os.environ.get)
  urls.py
```

**Regla de capas — nunca violar:**
- `views.py` → solo HTTP request/response, delega a services
- `services.py` → lógica de negocio pura
- `models.py` → modelos, reglas de dominio, estados
- Ninguna lógica de negocio en serializers ni en views

**Endpoints:** `/api/v1/{modulo}/{accion}/`

---

## Arquitectura del frontend

```
frontend/src/
  pages/Login.jsx        ← Formulario de login (Figma implementado)
  store/authStore.js     ← Zustand: accessToken, refreshToken en memoria
                            partialize: solo tokens van a localStorage
                            user/role NUNCA van a localStorage (RNF-SEG-01)
  api/
    axiosClient.js       ← Interceptores JWT: inyecta Bearer, renueva en 401
    authAPI.js           ← loginAPI(), logoutAPI()
```

---

## Comandos de desarrollo

### Backend
```bash
python manage.py runserver          # :8000
python manage.py migrate
python manage.py makemigrations
python manage.py test apps.authentication --verbosity=2   # solo AUT (implementado)
python manage.py check
python manage.py createsuperuser
```

### Frontend
```bash
cd frontend
npm run dev                         # :5173
npm run lint
npm run build
# npm test                          # disponible cuando se instale Vitest (ver sección CI)
```

---

## CI — GitHub Actions (`.github/workflows/ci.yml`)

El workflow corre automáticamente en cada push a `main`/`develop` y en cada PR a `main`.

### Jobs actuales
- **Backend**: PostgreSQL 15 real + migraciones + tests de AUT + cobertura ≥ 70%
- **Frontend**: `npm ci` + lint + build

### Cómo agregar un módulo al CI cuando lo implementes

Cuando crees e implementes un nuevo módulo, edita **una línea** en `.github/workflows/ci.yml`:

```yaml
# step: "Ejecutar tests con cobertura"
coverage run manage.py test \
  apps.authentication \
  apps.catalogo \       # ← agregar al implementar Corte 1
  apps.inventario \     # ← agregar al implementar Corte 2
  apps.recepcion \
  apps.produccion \
  apps.alertas \        # ← agregar al implementar Corte 3
  apps.indicadores \
  apps.auditoria \
  --verbosity=2
```

### Cómo activar Vitest en el CI cuando crees los tests de frontend

```bash
# 1. Instalar dependencias de test (una sola vez)
cd frontend
npm install -D vitest @vitest/coverage-v8 \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom axios-mock-adapter

# 2. Agregar script en package.json
# "test": "vitest run --coverage"

# 3. Descomentar el step en ci.yml:
# - name: Tests Vitest
#   run: npm test
```

El `vitest.config.js` y `src/__tests__/setup.js` ya están definidos en el plan de pruebas (sección 11.2).

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
| `core/settings.py` | Configuración Django (DB desde env vars) |
| `requirements.txt` | Dependencias Python con versiones pinneadas |
| `apps/authentication/` | Único módulo implementado actualmente |

---

**Actualizado**: Mayo 2026 — Corte 1 activo
