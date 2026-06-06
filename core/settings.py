# core/settings.py  — versión corregida completa
import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-du%@q$=_rmt$=9d%(-5w+3exfi34b@nz*e8ch#7y%7mea!hwm&',
)

DEBUG = os.environ.get('DEBUG', 'True').lower() not in ('false', '0', 'no')

_allowed = os.environ.get('ALLOWED_HOSTS', '')
ALLOWED_HOSTS = [h.strip() for h in _allowed.split(',') if h.strip()] if _allowed else ['*'] if DEBUG else []

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
    'rest_framework_simplejwt',                  # ✅ AÑADIDO
    'rest_framework_simplejwt.token_blacklist',  # ✅ AÑADIDO (necesario para logout)
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
    'corsheaders.middleware.CorsMiddleware',              # ✅ subido al inicio
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
        'PASSWORD': os.environ.get('DB_PASSWORD', '1234'),
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
    'ROTATE_REFRESH_TOKENS':  True,   # nuevo refresh en cada uso
    'BLACKLIST_AFTER_ROTATION': True,  # invalida el anterior
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
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:8000',
    *[o.strip() for o in _cors_extra.split(',') if o.strip()],
]

CORS_ALLOW_CREDENTIALS = True


LANGUAGE_CODE = 'es-co'
TIME_ZONE     = 'America/Bogota'
USE_I18N      = True
USE_TZ        = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'