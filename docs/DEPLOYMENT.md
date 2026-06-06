# Despliegue — Daluzed

Backend en **Railway** · Frontend en **Vercel** · Base de datos PostgreSQL gestionada por Railway.

---

## Requisitos previos

- Cuenta en [Railway](https://railway.app) con el repositorio conectado.
- Cuenta en [Vercel](https://vercel.com) con el repositorio conectado.
- CLI de Railway: `npm i -g @railway/cli` → `railway login`
- CLI de Vercel: `npm i -g vercel` → `vercel login`

---

## 1. Backend en Railway

### 1.1 Crear el proyecto

1. En Railway Dashboard → **New Project** → **Deploy from GitHub repo** → seleccionar `PN-daluzed`.
2. Railway detecta el `Dockerfile` automáticamente.
3. Agregar un plugin **PostgreSQL** al proyecto (New → Database → Add PostgreSQL).

### 1.2 Variables de entorno

En el servicio backend → **Variables** → agregar:

| Variable | Valor |
|---|---|
| `DJANGO_SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DEBUG` | `False` |
| `DB_NAME` | Copiar de la pestaña de la base de datos Railway |
| `DB_USER` | Copiar de la pestaña de la base de datos Railway |
| `DB_PASSWORD` | Copiar de la pestaña de la base de datos Railway |
| `DB_HOST` | Copiar de la pestaña de la base de datos Railway |
| `DB_PORT` | `5432` |
| `ALLOWED_HOSTS` | `tu-backend.up.railway.app` |
| `CORS_ALLOWED_ORIGINS_EXTRA` | `https://tu-app.vercel.app` *(completar tras el paso 2)* |

> Railway también expone `DATABASE_URL` como variable de entorno. Si prefieres usarla directamente, instala `dj-database-url` y configura `settings.py` acorde.

### 1.3 Migraciones iniciales

```bash
# Conectarse al servicio y ejecutar migraciones una sola vez:
railway run python manage.py migrate
railway run python manage.py createsuperuser
```

### 1.4 Verificar HTTPS

Railway asigna automáticamente un dominio `*.up.railway.app` con HTTPS.
Verificar en: **Settings → Networking → Public Networking**.

---

## 2. Frontend en Vercel

### 2.1 Crear el proyecto

1. En Vercel Dashboard → **Add New Project** → importar `PN-daluzed`.
2. **Root Directory**: `frontend`
3. **Framework Preset**: Vite
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`

### 2.2 Variables de entorno

En el proyecto Vercel → **Settings → Environment Variables**:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | URL del backend Railway, ej: `https://pn-daluzed.up.railway.app` |

> Sin trailing slash. Esta variable le dice a Axios dónde está el backend en producción.

### 2.3 Dominio y HTTPS

Vercel proporciona HTTPS automáticamente en `*.vercel.app`.
Copiar la URL (`https://tu-app.vercel.app`) y actualizar `CORS_ALLOWED_ORIGINS_EXTRA` en Railway.

### 2.4 SPA routing

El archivo `frontend/vercel.json` ya configura el rewrite:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
Esto garantiza que todas las rutas de React Router funcionen sin 404 en reload.

---

## 3. Verificación post-deploy

```bash
# 1. Backend responde
curl https://tu-backend.up.railway.app/api/v1/auth/health/

# 2. Swagger accessible
curl https://tu-backend.up.railway.app/api/docs/

# 3. Frontend carga en Vercel
open https://tu-app.vercel.app

# 4. Login funciona con credenciales reales
```

---

## 4. Rollback

- **Railway**: En el proyecto → **Deployments** → seleccionar el deploy anterior → **Redeploy**.
- **Vercel**: En el proyecto → **Deployments** → seleccionar el deploy anterior → **Promote to Production**.

---

## 5. Variables de entorno — referencia completa

Ver `.env.production.example` en la raíz del repositorio.
