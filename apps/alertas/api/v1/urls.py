# apps/alertas/api/v1/urls.py
from django.urls import path

from .views import alertas_reorden, alertas_vencimiento, alertas_produccion_vencida

urlpatterns = [
    path('reorden/',            alertas_reorden,             name='alertas-reorden'),
    path('vencimiento/',        alertas_vencimiento,         name='alertas-vencimiento'),
    path('produccion-vencida/', alertas_produccion_vencida,  name='alertas-produccion-vencida'),
]
