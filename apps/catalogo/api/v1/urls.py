from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.catalogo.api.v1.views import (
    ImportarCatalogoView,
    MateriaPrimaViewSet,
    ProductoTerminadoViewSet,
    ProveedorViewSet,
    UnidadMedidaViewSet,
)

router = DefaultRouter()
router.register(r'unidades-medida', UnidadMedidaViewSet, basename='unidades-medida')
router.register(r'materias-primas', MateriaPrimaViewSet, basename='materias-primas')
router.register(r'proveedores', ProveedorViewSet, basename='proveedores')
router.register(r'productos-terminados', ProductoTerminadoViewSet, basename='productos-terminados')

urlpatterns = [
    path('', include(router.urls)),
    path('importar/', ImportarCatalogoView.as_view(), name='catalogo-importar'),
]
