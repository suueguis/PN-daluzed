# apps/inventario/api/v1/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BodegaViewSet,
    ZonaBodegaViewSet,
    LoteListView,
    StockView,
    StockPDPView,
    ReordenView,
    FefoView,
    TrasladoViewSet,
    DevolucionView,
    DescarteView,
    TrazabilidadView,
    KardexView,
)

router = DefaultRouter()
router.register('bodegas', BodegaViewSet, basename='bodega')
router.register('zonas',   ZonaBodegaViewSet, basename='zona')
router.register('traslados', TrasladoViewSet, basename='traslado')

urlpatterns = [
    path('lotes/',                          LoteListView.as_view(),  name='inv_lotes'),
    path('stock/',                          StockView.as_view(),     name='inv_stock'),
    path('stock-pdp/',                      StockPDPView.as_view(),  name='inv_stock_pdp'),
    path('reorden/',                        ReordenView.as_view(),   name='inv_reorden'),
    path('fefo/',                           FefoView.as_view(),      name='inv_fefo'),
    path('devoluciones/',                   DevolucionView.as_view(), name='inv_devoluciones'),
    path('descartes/',                      DescarteView.as_view(),  name='inv_descartes'),
    path('trazabilidad/<int:lote_id>/',     TrazabilidadView.as_view(), name='inv_trazabilidad'),
    path('kardex/',                         KardexView.as_view(),       name='inv_kardex'),
    path('', include(router.urls)),
]
