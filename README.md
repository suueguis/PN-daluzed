# Daluzed Inventario

Sistema de gestión de inventario para una empresa de repostería familiar.
Cubre catálogo de materias primas, control de bodegas, recepciones, producción por batidos, alertas en tiempo real y auditoría de operaciones.

![CI](https://github.com/suueguis/PN-daluzed/actions/workflows/ci.yml/badge.svg)

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Django 4.2 + Django REST Framework + SimpleJWT + Django-Axes |
| Frontend | React 19 + Vite + Tailwind CSS v4 + Zustand |
| Base de datos | PostgreSQL 15 |
| Tiempo real | Django Channels + Daphne (ASGI) — WebSocket de alertas |
| Hosting | Railway (backend) + Vercel (frontend) |

---

## Módulos implementados

| Módulo | Descripción |
|--------|-------------|
| AUT — Autenticación | Login con JWT, RBAC por rol, protección fuerza bruta (Axes) |
| CAT — Catálogo | Materias primas, productos terminados, proveedores, unidades, presentaciones |
| INV — Inventario | Bodegas, lotes, stock, traslados, devoluciones, descartes, kardex |
| REC — Recepción | Órdenes de compra, recepciones parciales, PDF, validación de vencimiento |
| PROD — Producción | Batidos (FEFO), despachos (FIFO), compensatorios, jornada activa |
| ALR — Alertas | Stock bajo, vencimiento próximo, lotes en espera — WebSocket tiempo real |
| IND — Indicadores | KPIs, utilización de bodega, reporte semanal, exportación PDF/XLSX |
| AUD — Auditoría | Bitácora de operaciones críticas con IP y detalle JSON |

---

## Producción

| Servicio | URL |
|----------|-----|
| Frontend (Vercel) | https://frontend-two-chi-31.vercel.app |
| Backend API (Railway) | https://pn-daluzed-production.up.railway.app |
| Swagger UI | https://pn-daluzed-production.up.railway.app/api/docs/ |
| WebSocket alertas | `wss://pn-daluzed-production.up.railway.app/ws/alertas/` |

---

## Arranque local

**Backend:**
```bash
python manage.py migrate
python manage.py runserver          # :8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev                         # :5173
```

**Con Docker (PostgreSQL incluido):**
```bash
docker-compose up --build
```

---

## Datos de prueba

Crea un usuario por cada rol (idempotente):
```bash
python manage.py seed_demo_users
```

| Rol | Email | Password |
|-----|-------|----------|
| ADMIN | `admin.demo@daluzed.com` | `Daluzed2026!` |
| GERENTE | `gerente.demo@daluzed.com` | `Daluzed2026!` |
| PRODUCCION | `produccion.demo@daluzed.com` | `Daluzed2026!` |
| INVENTARIO | `inventario.demo@daluzed.com` | `Daluzed2026!` |

Poblar con datos de ejemplo en todos los módulos (catálogo, bodegas, lotes, OC, batidos, alertas, auditoría):
```bash
python manage.py seed_visual_data

# Borra datos previos y los recrea desde cero (no elimina usuarios)
python manage.py seed_visual_data --flush
```

---

## Tests

```bash
# Backend — todos los módulos (125 casos)
python manage.py test apps.authentication apps.catalogo apps.inventario \
  apps.recepcion apps.produccion apps.alertas apps.indicadores apps.auditoria \
  --verbosity=2

# Frontend — Vitest (componentes y unitarios)
cd frontend && npm test
```

El CI corre ambos suites automáticamente en cada PR a `main` con cobertura ≥ 70%.

---

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) | Referencia completa de endpoints REST por módulo |
| [`docs/MODELO_DATOS.md`](docs/MODELO_DATOS.md) | Esquema de BD — todos los modelos, campos y relaciones |
| [`docs/PERMISOS_MATRIZ.md`](docs/PERMISOS_MATRIZ.md) | Qué roles pueden acceder a cada endpoint |
| [`docs/WEBSOCKET_PROTOCOL.md`](docs/WEBSOCKET_PROTOCOL.md) | Protocolo WebSocket de alertas en tiempo real |
| [`docs/contexto.md`](docs/contexto.md) | Contexto del cliente y decisiones técnicas |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Runbook de despliegue Railway + Vercel |
| [`docs/BACKUP_RESTORE.md`](docs/BACKUP_RESTORE.md) | Backup y restore de PostgreSQL en Railway |
| [`AGENTS.md`](AGENTS.md) | Instrucciones de arquitectura para el equipo y herramientas IA |
| [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md) | Workflow de contribución y reglas del equipo |

---

## Mantenimiento en producción

Si el superuser de Railway da 403 en endpoints de producción, batidos o alertas:
```bash
python manage.py fix_superuser_roles
```

> **Backups Railway**: Los backups automáticos de PostgreSQL requieren plan Pro.
> Backup manual: `pg_dump` usando `DATABASE_PUBLIC_URL`.
