# apps/recepcion/api/v1/views.py
from rest_framework import status, mixins, viewsets
from rest_framework.response import Response

from apps.recepcion.models import OrdenCompra, RecepcionMercancia
from apps.recepcion.services import RecepcionService, VidaUtilInsuficienteError
from .serializers import (
    RecepcionCreateSerializer,
    RecepcionMercanciaSerializer,
    OrdenCompraSerializer,
)


class OrdenCompraViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = OrdenCompra.objects.all().order_by('-fecha_creacion')
    serializer_class = OrdenCompraSerializer


class RecepcionViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    queryset = RecepcionMercancia.objects.all().order_by('-fecha')
    serializer_class = RecepcionMercanciaSerializer

    def create(self, request, *args, **kwargs):
        serializer = RecepcionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data
        try:
            recepcion = RecepcionService.registrar_recepcion(
                orden_compra=vd['orden_compra'],
                detalles=vd['detalles'],
                usuario=request.user,
                justificacion_vencimiento=vd.get('justificacion_vencimiento', ''),
            )
        except VidaUtilInsuficienteError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            RecepcionMercanciaSerializer(recepcion).data,
            status=status.HTTP_201_CREATED,
        )
