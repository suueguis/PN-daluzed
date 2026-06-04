from django.urls import path
from .views import KpisView, ExportarView

urlpatterns = [
    path('kpis/',     KpisView.as_view(),     name='ind_kpis'),
    path('exportar/', ExportarView.as_view(), name='ind_exportar'),
]
