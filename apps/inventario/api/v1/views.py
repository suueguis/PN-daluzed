# apps/inventario/api/v1/views.py
from rest_framework import status, mixins, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import get_object_or_404

from apps.authentication.permissions import allow_roles
from apps.inventario.models import Bodega, ZonaBodega, Lote, MovimientoInventario

_INV_READ  = ('ADMIN', 'GERENTE', 'INVENTARIO')
_INV_WRITE = ('ADMIN', 'INVENTARIO')
from apps.inventario.services import InventarioService, calcular_kardex
from apps.auditoria.services import registrar_operacion, get_client_ip
from .serializers import (
    BodegaSerializer,
    ZonaBodegaSerializer,
    KardexRowSerializer,
    LoteSerializer,
    MovimientoSerializer,
    TrasladoCreateSerializer,
    DevolucionCreateSerializer,
    DescarteCreateSerializer,
)


# ── Bodegas ───────────────────────────────────────────────────────────────────

class BodegaViewSet(viewsets.ModelViewSet):
    queryset = Bodega.objects.prefetch_related('zonas').order_by('nombre')
    serializer_class = BodegaSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_INV_READ)()]
        return [allow_roles(*_INV_WRITE)()]


# ── Zonas de bodega ───────────────────────────────────────────────────────────

class ZonaBodegaViewSet(viewsets.ModelViewSet):
    serializer_class = ZonaBodegaSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_INV_READ)()]
        return [allow_roles(*_INV_WRITE)()]

    def get_queryset(self):
        qs = ZonaBodega.objects.select_related('bodega').order_by('nombre')
        bodega_id = self.request.query_params.get('bodega')
        if bodega_id:
            qs = qs.filter(bodega_id=bodega_id)
        return qs


# ── Lotes (listado con filtros) ────────────────────────────────────────────────

class LoteListView(APIView):
    permission_classes = [allow_roles(*_INV_READ)]

    def get(self, request):
        qs = Lote.objects.select_related('materia_prima', 'bodega').filter(cantidad__gt=0)
        mp_id = request.query_params.get('materia_prima')
        bodega_id = request.query_params.get('bodega')
        vence_antes_de = request.query_params.get('vence_antes_de')
        if mp_id:
            qs = qs.filter(materia_prima_id=mp_id)
        if bodega_id:
            qs = qs.filter(bodega_id=bodega_id)
        if vence_antes_de:
            qs = qs.filter(fecha_vencimiento__lte=vence_antes_de)
        return Response(LoteSerializer(qs, many=True).data)


# ── Stock ─────────────────────────────────────────────────────────────────────

class StockView(APIView):
    permission_classes = [allow_roles(*_INV_READ)]

    def get(self, request):
        mp_id = request.query_params.get('materia_prima')
        bodega_id = request.query_params.get('bodega')
        data = InventarioService.consultar_stock(mp_id, bodega_id)
        return Response(data)


# ── Punto de reorden ──────────────────────────────────────────────────────────

class ReordenView(APIView):
    permission_classes = [allow_roles(*_INV_READ)]

    def get(self, request):
        mp_id = request.query_params.get('materia_prima')
        data = InventarioService.consultar_reorden(mp_id)
        return Response(data)


# ── FEFO ──────────────────────────────────────────────────────────────────────

class FefoView(APIView):
    permission_classes = [allow_roles(*_INV_READ)]

    def get(self, request):
        mp_id = request.query_params.get('materia_prima')
        bodega_id = request.query_params.get('bodega')
        excluir_vencidos = request.query_params.get('excluir_vencidos', 'false').lower() == 'true'
        result = InventarioService.sugerir_fefo(mp_id, bodega_id, excluir_vencidos)
        return Response({
            'lote_sugerido': LoteSerializer(result['lote_sugerido']).data if result['lote_sugerido'] else None,
            'lotes': LoteSerializer(result['lotes'], many=True).data,
        })


# ── Traslados (inmutables tras creación) ──────────────────────────────────────

class TrasladoViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    queryset = MovimientoInventario.objects.filter(tipo='TRASLADO')
    serializer_class = MovimientoSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_INV_READ)()]
        return [allow_roles(*_INV_WRITE)()]

    def create(self, request, *args, **kwargs):
        serializer = TrasladoCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            movimiento = InventarioService.registrar_traslado(
                lote=serializer.validated_data['lote_id'],
                bodega_destino=serializer.validated_data['bodega_destino'],
                cantidad=serializer.validated_data['cantidad'],
                usuario=request.user,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        registrar_operacion(
            request.user,
            'TRASLADO',
            {'movimiento_id': movimiento.pk, 'lote_id': movimiento.lote_id},
            get_client_ip(request),
        )
        return Response(MovimientoSerializer(movimiento).data, status=status.HTTP_201_CREATED)


# ── Devoluciones ──────────────────────────────────────────────────────────────

class DevolucionView(APIView):
    permission_classes = [allow_roles(*_INV_WRITE)]

    def post(self, request):
        serializer = DevolucionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        movimiento = InventarioService.registrar_devolucion(
            lote=serializer.validated_data['lote_id'],
            proveedor=serializer.validated_data['proveedor_id'],
            motivo=serializer.validated_data['motivo'],
            usuario=request.user,
        )
        return Response(MovimientoSerializer(movimiento).data, status=status.HTTP_201_CREATED)


# ── Descartes ─────────────────────────────────────────────────────────────────

class DescarteView(APIView):
    permission_classes = [allow_roles(*_INV_WRITE)]

    def post(self, request):
        serializer = DescarteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        movimiento = InventarioService.registrar_descarte(
            lote=serializer.validated_data['lote_id'],
            motivo=serializer.validated_data['motivo'],
            usuario=request.user,
        )
        return Response(MovimientoSerializer(movimiento).data, status=status.HTTP_201_CREATED)


# ── Trazabilidad ──────────────────────────────────────────────────────────────

class TrazabilidadView(APIView):
    permission_classes = [allow_roles(*_INV_READ)]

    def get(self, request, lote_id):
        lote = get_object_or_404(Lote, pk=lote_id)
        movimientos = MovimientoInventario.objects.filter(lote=lote).order_by('fecha')
        return Response({
            'lote_id': lote_id,
            'movimientos': MovimientoSerializer(movimientos, many=True).data,
        })


# ── Kardex ───────────────────────────────────────────────────────────────────

class KardexView(APIView):
    permission_classes = [allow_roles(*_INV_READ)]

    def get(self, request):
        mp_id = request.query_params.get('materia_prima')
        if not mp_id:
            return Response({'detail': 'El parámetro materia_prima es requerido.'}, status=400)

        from apps.catalogo.models import MateriaPrima
        if not MateriaPrima.objects.filter(pk=mp_id).exists():
            return Response({'detail': 'Materia prima no encontrada.'}, status=404)

        rows = calcular_kardex(
            materia_prima_id=mp_id,
            desde=request.query_params.get('desde'),
            hasta=request.query_params.get('hasta'),
            tipo=request.query_params.get('tipo'),
        )
        return Response(KardexRowSerializer(rows, many=True).data)
