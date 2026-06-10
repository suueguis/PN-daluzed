# core/settings.py
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Carga variables de entorno desde .env (desarrollo local).
# En producción (Railway) las vars se inyectan directamente — .env no existe allí.
load_dotenv(BASE_DIR / '.env')

# ── Seguridad fundamental ──────────────────────────────────────────────────────
# En producción DJANGO_SECRET_KEY DEBE estar seteada como variable de entorno.
# No hay fallback inseguro — si falta, el arranque falla de forma explícita.
DEBUG = os.environ.get('DEBUG', 'True').lower() not in ('false', '0', 'no')

SECRET_KEY = (
    os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-local-dev-only-change-in-prod-!!!!')
    if DEBUG
    else os.environ['DJANGO_SECRET_KEY']   # producción: KeyError explícito si no está seteada
)

_allowed = os.environ.get('ALLOWED_HOSTS', '')
ALLOWED_HOSTS = [h.strip() for h in _allowed.split(',') if h.strip()] if _allowed else ['*'] if DEBUG else []
ALLOWED_HOSTS.append('healthcheck.railway.app')

INSTALLED_APPS = [
    # Daphne debe ir ANTES de django.contrib.staticfiles
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Terceros
    'channels',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'axes',
    'drf_spectacular',
    # Locales
    'apps.authentication',
    'apps.catalogo',
    'apps.inventario',
    'apps.recepcion',
    'apps.produccion',
    'apps.alertas',
    'apps.indicadores',
    'apps.auditoria',
]

# ──────────────────────────────────────────────
# Django Channels (RF-ALR-05) — WebSocket
# ──────────────────────────────────────────────
ASGI_APPLICATION = 'core.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# ──────────────────────────────────────────────
# MIDDLEWARE
# Orden correcto: CorsMiddleware lo más arriba posible,
# AxesMiddleware después de SessionMiddleware.
# ──────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'axes.middleware.AxesMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME':     os.environ.get('DB_NAME',     'daluzed_db'),
        'USER':     os.environ.get('DB_USER',     'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST':     os.environ.get('DB_HOST',     'localhost'),
        'PORT':     os.environ.get('DB_PORT',     '5432'),
    }
}


AUTH_USER_MODEL = 'authentication.User'

AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesStandaloneBackend',
    'django.contrib.auth.backends.ModelBackend',
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}


SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':  True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}


AXES_FAILURE_LIMIT   = 5
AXES_COOLOFF_TIME    = 1   # horas de bloqueo
AXES_LOCKOUT_TEMPLATE = None
AXES_ENABLE_ADMIN    = True
AXES_USERNAME_FORM_FIELD   = 'email'
AXES_LOCKOUT_PARAMETERS    = ['username', 'ip_address']


SPECTACULAR_SETTINGS = {
    'TITLE': 'Daluzed API — Gestión de Inventario',
    'DESCRIPTION': 'Documentación de endpoints v1 para control de panadería.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}


_cors_extra = os.environ.get('CORS_ALLOWED_ORIGINS_EXTRA', '')
_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:8000',
    *[o.strip() for o in _cors_extra.split(',') if o.strip()],
    *[o.strip() for o in _cors_origins.split(',') if o.strip()],
]

CORS_ALLOW_CREDENTIALS = True


LANGUAGE_CODE = 'es-co'
TIME_ZONE     = 'America/Bogota'
USE_I18N      = True
USE_TZ        = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Cabeceras de seguridad HTTP (OWASP A05 — Security Misconfiguration) ───────
# Activas solo en producción para no romper el flujo local de desarrollo.
if not DEBUG:
    # Railway (and similar PaaS) terminates TLS at the edge proxy, so the app
    # receives plain HTTP internally. Do NOT set SECURE_SSL_REDIRECT = True —
    # it would 301-redirect Railway's internal healthcheck requests and break
    # deployments. HSTS headers are still safe to set.
    SECURE_SSL_REDIRECT             = False
    SECURE_HSTS_SECONDS             = 31_536_000
    SECURE_HSTS_INCLUDE_SUBDOMAINS  = True
    SECURE_HSTS_PRELOAD             = True
    # Previene que el browser interprete archivos con tipo MIME incorrecto
    SECURE_CONTENT_TYPE_NOSNIFF     = True
    # Cookie de sesión solo viaja por HTTPS
    SESSION_COOKIE_SECURE           = True
    SESSION_COOKIE_HTTPONLY         = True
    SESSION_COOKIE_SAMESITE         = 'None'
    # Cookie CSRF solo viaja por HTTPS
    CSRF_COOKIE_SECURE              = True
    CSRF_COOKIE_HTTPONLY            = True
    CSRF_COOKIE_SAMESITE            = 'None'
    # Protección contra clickjacking
    X_FRAME_OPTIONS                 = 'DENY'
    # Requiere que el SECRET_KEY esté seteado explícitamente en producción
    if os.environ.get('DJANGO_SECRET_KEY', '').startswith('django-insecure'):
        raise RuntimeError(
            'DJANGO_SECRET_KEY no puede usar el valor inseguro por defecto en producción. '
            'Configura la variable de entorno DJANGO_SECRET_KEY en Railway.'
        )
else:
    # Desarrollo local: evita problemas cross-origin con cookies
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_SAMESITE    = 'Lax'
    X_FRAME_OPTIONS         = 'SAMEORIGIN'
