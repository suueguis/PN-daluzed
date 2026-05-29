# apps/recepcion/api/v1/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrdenCompraViewSet, RecepcionViewSet

router = DefaultRouter()
router.register(r'ordenes', OrdenCompraViewSet, basename='ordencompra')
router.register(r'', RecepcionViewSet, basename='recepcion')

urlpatterns = [
    path('', include(router.urls)),
]
