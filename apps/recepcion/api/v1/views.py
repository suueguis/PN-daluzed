# apps/recepcion/api/v1/views.py
from django.db import transaction
from rest_framework import status, mixins, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.authentication.permissions import allow_roles

_REC_READ  = ('ADMIN', 'GERENTE', 'INVENTARIO')
_REC_WRITE = ('ADMIN', 'INVENTARIO')

from apps.catalogo.models import MateriaPrima, Presentacion
from apps.recepcion.models import OrdenCompra, RecepcionMercancia, DetalleOrdenCompra
from apps.recepcion.services import RecepcionService, VidaUtilInsuficienteError
from .serializers import (
    RecepcionCreateSerializer,
    RecepcionMercanciaSerializer,
    OrdenCompraSerializer,
)


class OrdenCompraViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = OrdenCompraSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_REC_READ)()]
        return [allow_roles(*_REC_WRITE)()]

    def get_queryset(self):
        qs = (
            OrdenCompra.objects
            .prefetch_related('detalles__materia_prima', 'detalles__presentacion')
            .select_related('proveedor')
            .order_by('-fecha_creacion')
        )
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        oc = OrdenCompra.objects.create(
            proveedor=serializer.validated_data['proveedor'],
            usuario_creador=self.request.user,
        )
        for d in self.request.data.get('detalles', []):
            try:
                mp   = MateriaPrima.objects.get(pk=d['materia_prima_id'])
                pres = Presentacion.objects.get(pk=d['presentacion_id'])
            except (MateriaPrima.DoesNotExist, Presentacion.DoesNotExist, KeyError) as exc:
                raise ValidationError({'detalles': str(exc)})
            DetalleOrdenCompra.objects.create(
                orden=oc,
                materia_prima=mp,
                presentacion=pres,
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

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_REC_READ)()]
        return [allow_roles(*_REC_WRITE)()]

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
