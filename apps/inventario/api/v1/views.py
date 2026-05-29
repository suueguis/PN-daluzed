# apps/inventario/api/v1/views.py
from rest_framework import status, mixins, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import get_object_or_404

from apps.inventario.models import Lote, MovimientoInventario
from apps.inventario.services import InventarioService
from .serializers import (
    LoteSerializer,
    MovimientoSerializer,
    TrasladoCreateSerializer,
    DevolucionCreateSerializer,
    DescarteCreateSerializer,
)


# ── Stock ─────────────────────────────────────────────────────────────────────

class StockView(APIView):
    def get(self, request):
        mp_id = request.query_params.get('materia_prima')
        bodega_id = request.query_params.get('bodega')
        data = InventarioService.consultar_stock(mp_id, bodega_id)
        return Response(data)


# ── Punto de reorden ──────────────────────────────────────────────────────────

class ReordenView(APIView):
    def get(self, request):
        mp_id = request.query_params.get('materia_prima')
        data = InventarioService.consultar_reorden(mp_id)
        return Response(data)


# ── FEFO ──────────────────────────────────────────────────────────────────────

class FefoView(APIView):
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
        return Response(MovimientoSerializer(movimiento).data, status=status.HTTP_201_CREATED)


# ── Devoluciones ──────────────────────────────────────────────────────────────

class DevolucionView(APIView):
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
    def get(self, request, lote_id):
        lote = get_object_or_404(Lote, pk=lote_id)
        movimientos = MovimientoInventario.objects.filter(lote=lote).order_by('fecha')
        return Response({
            'lote_id': lote_id,
            'movimientos': MovimientoSerializer(movimientos, many=True).data,
        })
