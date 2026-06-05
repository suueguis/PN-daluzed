# apps/alertas/api/v1/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    alertas_activas,
    alertas_produccion_vencida,
    alertas_reorden,
    alertas_vencimiento,
    resolver_alerta,
    ConfiguracionAletaViewSet,
)

router = DefaultRouter()
router.register(r'configuracion', ConfiguracionAletaViewSet, basename='alertas-configuracion')

urlpatterns = router.urls + [
    path('activas/',                  alertas_activas,             name='alertas-activas'),
    path('reorden/',                  alertas_reorden,             name='alertas-reorden'),
    path('vencimiento/',              alertas_vencimiento,         name='alertas-vencimiento'),
    path('produccion-vencida/',       alertas_produccion_vencida,  name='alertas-produccion-vencida'),
    path('<int:alerta_id>/resolver/', resolver_alerta,             name='alertas-resolver'),
]
