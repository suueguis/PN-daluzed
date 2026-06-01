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


from apps.recepcion.models import OrdenCompra, RecepcionMercancia, DetalleOrdenCompra

class OrdenCompraViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = OrdenCompraSerializer

    def get_queryset(self):
        qs = OrdenCompra.objects.prefetch_related('detalles__materia_prima', 'detalles__presentacion').select_related('proveedor').order_by('-fecha_creacion')
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    def perform_create(self, serializer):
        import json
        proveedor = serializer.validated_data['proveedor']
        oc = OrdenCompra.objects.create(
            proveedor=proveedor,
            usuario_creador=self.request.user,
        )
        detalles_data = self.request.data.get('detalles', [])
        for d in detalles_data:
            from apps.catalogo.models import MateriaPrima, Presentacion
            DetalleOrdenCompra.objects.create(
                orden=oc,
                materia_prima=MateriaPrima.objects.get(pk=d['materia_prima_id']),
                presentacion=Presentacion.objects.get(pk=d['presentacion_id']),
                cantidad_presentacion=d['cantidad_presentacion'],
            )
        return oc

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        oc = self.perform_create(serializer)
        return Response(
            self.get_serializer(oc).data,
            status=status.HTTP_201_CREATED,
        )


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
