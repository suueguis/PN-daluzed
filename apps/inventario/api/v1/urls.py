# apps/inventario/api/v1/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StockView,
    ReordenView,
    FefoView,
    TrasladoViewSet,
    DevolucionView,
    DescarteView,
    TrazabilidadView,
)

router = DefaultRouter()
router.register('traslados', TrasladoViewSet, basename='traslado')

urlpatterns = [
    path('stock/',                          StockView.as_view(),    name='inv_stock'),
    path('reorden/',                        ReordenView.as_view(),  name='inv_reorden'),
    path('fefo/',                           FefoView.as_view(),     name='inv_fefo'),
    path('devoluciones/',                   DevolucionView.as_view(), name='inv_devoluciones'),
    path('descartes/',                      DescarteView.as_view(), name='inv_descartes'),
    path('trazabilidad/<int:lote_id>/',     TrazabilidadView.as_view(), name='inv_trazabilidad'),
    path('', include(router.urls)),
]
