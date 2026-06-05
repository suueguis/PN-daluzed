from django.urls import path
from .views import KpisView, ExportarView, UtilizacionBodegaView, ReporteSemanalView

urlpatterns = [
    path('kpis/',              KpisView.as_view(),          name='ind_kpis'),
    path('exportar/',          ExportarView.as_view(),      name='ind_exportar'),
    path('utilizacion-bodega/', UtilizacionBodegaView.as_view(), name='ind_utilizacion_bodega'),
    path('reporte-semanal/',   ReporteSemanalView.as_view(), name='ind_reporte_semanal'),
]
