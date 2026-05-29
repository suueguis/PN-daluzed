# core/urls.py
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),

    # ── Autenticación v1 ──────────────────────────────────────────
    path('api/v1/auth/', include('apps.authentication.api.v1.urls')),

    # ── Catálogo Maestro v1 ────────────────────────────────────────
    path('api/v1/catalogo/', include('apps.catalogo.api.v1.urls')),

    # ── Inventario v1 ─────────────────────────────────────────────
    path('api/v1/inventario/', include('apps.inventario.api.v1.urls')),

    # ── Recepción v1 ──────────────────────────────────────────────
    path('api/v1/recepcion/', include('apps.recepcion.api.v1.urls')),

    # ── Producción v1 ─────────────────────────────────────────────
    path('api/v1/produccion/', include('apps.produccion.api.v1.urls')),

    # ── Alertas v1 ────────────────────────────────────────────────
    path('api/v1/alertas/', include('apps.alertas.api.v1.urls')),

    # ── Swagger / OpenAPI ─────────────────────────────────────────
    path('api/schema/',          SpectacularAPIView.as_view(),        name='schema'),
    path('api/docs/',            SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]