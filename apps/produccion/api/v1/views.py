# apps/produccion/api/v1/views.py
from datetime import date as date_cls

from rest_framework import status, mixins, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from apps.authentication.permissions import allow_roles

_PROD_READ  = ('ADMIN', 'GERENTE', 'PRODUCCION')
_PROD_WRITE = ('ADMIN', 'PRODUCCION')

from apps.produccion.models import (
    Batido, LoteProductoTerminado, MovimientoCompensatorio,
)
from apps.produccion.services import (
    ProduccionService,
    StockInsuficienteError,
    LimiteBatidosError,
    DespachoIrreversibleError,
)
from .serializers import (
    BatidoCreateSerializer,
    BatidoSerializer,
    LoteProductoTerminadoSerializer,
    MovimientoCompensatorioCreateSerializer,
    MovimientoCompensatorioSerializer,
)


class BatidoViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Batido.objects.all()
    serializer_class = BatidoSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_PROD_READ)()]
        return [allow_roles(*_PROD_WRITE)()]

    def create(self, request, *args, **kwargs):
        serializer = BatidoCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data
        try:
            batido = ProduccionService.registrar_batido(
                producto_terminado=vd['producto_terminado'],
                fecha_produccion=vd['fecha_produccion'],
                hora_inicio=vd['hora_inicio'],
                ingredientes=vd['ingredientes'],
                usuario=request.user if request.user.is_authenticated else None,
            )
        except (StockInsuficienteError, LimiteBatidosError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            BatidoSerializer(batido).data, status=status.HTTP_201_CREATED,
        )


class DespachoViewSet(
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """LoteProductoTerminado expuesto para despacho.

    PATCH/PUT/DELETE no soportados (responden 405) → despacho irreversible.
    """
    queryset = LoteProductoTerminado.objects.all()
    serializer_class = LoteProductoTerminadoSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_PROD_READ)()]
        return [allow_roles(*_PROD_WRITE)()]

    @action(detail=True, methods=['post'])
    def despachar(self, request, pk=None):
        lote_pt = self.get_object()
        try:
            ProduccionService.despachar_lote(
                lote_pt, usuario=request.user if request.user.is_authenticated else None,
            )
        except DespachoIrreversibleError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            LoteProductoTerminadoSerializer(lote_pt).data,
            status=status.HTTP_200_OK,
        )


class CompensatorioViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    queryset = MovimientoCompensatorio.objects.all()
    serializer_class = MovimientoCompensatorioSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_PROD_READ)()]
        return [allow_roles(*_PROD_WRITE)()]

    def create(self, request, *args, **kwargs):
        serializer = MovimientoCompensatorioCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data
        comp = ProduccionService.registrar_compensatorio(
            tipo_afectado=vd['tipo_afectado'],
            id_afectado=vd['id_afectado'],
            datos_originales=vd['datos_originales'],
            datos_corregidos=vd['datos_corregidos'],
            descripcion=vd['descripcion'],
            usuario=request.user if request.user.is_authenticated else None,
        )
        return Response(
            MovimientoCompensatorioSerializer(comp).data,
            status=status.HTTP_201_CREATED,
        )


# ── Endpoints de consulta (function-based) ────────────────────────────
@api_view(['GET'])
@permission_classes([allow_roles(*_PROD_READ)])
def sugerencia_fefo(request):
    producto_id = request.query_params.get('producto_terminado_id')
    producto = None
    if producto_id:
        from apps.catalogo.models import ProductoTerminado
        producto = ProductoTerminado.objects.filter(pk=producto_id).first()
    sugerencias = ProduccionService.sugerir_fefo_ingredientes(producto)
    return Response({'sugerencias': sugerencias})


@api_view(['GET'])
@permission_classes([allow_roles(*_PROD_READ)])
def sugerencia_fifo(request):
    producto_id = request.query_params.get('producto_terminado_id')
    if not producto_id:
        return Response(
            {'detail': 'producto_terminado_id es requerido.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    from apps.catalogo.models import ProductoTerminado
    producto = ProductoTerminado.objects.filter(pk=producto_id).first()
    if not producto:
        return Response(
            {'detail': 'Producto no encontrado.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    lote = ProduccionService.sugerir_fifo_despacho(producto)
    return Response({
        'lote_sugerido': LoteProductoTerminadoSerializer(lote).data if lote else None,
    })


@api_view(['GET'])
@permission_classes([allow_roles(*_PROD_READ)])
def jornada(request):
    fecha_str = request.query_params.get('fecha')
    fecha = date_cls.fromisoformat(fecha_str) if fecha_str else date_cls.today()
    return Response(ProduccionService.jornada_del_dia(fecha))
