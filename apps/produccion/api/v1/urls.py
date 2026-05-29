# apps/produccion/api/v1/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    BatidoViewSet,
    DespachoViewSet,
    CompensatorioViewSet,
    sugerencia_fefo,
    sugerencia_fifo,
    jornada,
)

router = DefaultRouter()
router.register(r'batidos', BatidoViewSet, basename='batido')
router.register(r'despachos', DespachoViewSet, basename='despacho')
router.register(r'compensatorios', CompensatorioViewSet, basename='compensatorio')

urlpatterns = [
    path('sugerencia-fefo/', sugerencia_fefo, name='sugerencia-fefo'),
    path('sugerencia-fifo/', sugerencia_fifo, name='sugerencia-fifo'),
    path('jornadas/',        jornada,         name='jornadas'),
    path('', include(router.urls)),
]
