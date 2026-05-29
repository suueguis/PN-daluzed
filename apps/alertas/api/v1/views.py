# apps/alertas/api/v1/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.alertas.models import Alerta
from apps.alertas.services import AlertaService
from apps.catalogo.models import MateriaPrima
from .serializers import AlertaSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alertas_reorden(request):
    """Evalúa stock vs reorden para todas las MP activas y devuelve las STOCK_BAJO."""
    for mp in MateriaPrima.objects.filter(activo=True):
        AlertaService.verificar_stock_reorden(mp)
    alertas = Alerta.objects.filter(tipo='STOCK_BAJO', activa=True)
    return Response(AlertaSerializer(alertas, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alertas_vencimiento(request):
    dias = int(request.query_params.get('dias', 7))
    AlertaService.verificar_vencimientos(dias_umbral=dias)
    alertas = Alerta.objects.filter(tipo='VENCIMIENTO_PROXIMO', activa=True)
    return Response(AlertaSerializer(alertas, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alertas_produccion_vencida(request):
    """Lotes PT EN_ESPERA cuyo vencimiento ya pasó."""
    from datetime import date
    from apps.produccion.models import LoteProductoTerminado
    lotes = LoteProductoTerminado.objects.filter(
        estado='EN_ESPERA',
        fecha_vencimiento__lt=date.today(),
    )
    data = [
        {
            'lote_pt_id':        lote.id,
            'producto':          lote.batido.producto_terminado.nombre,
            'cantidad':          lote.cantidad,
            'fecha_vencimiento': lote.fecha_vencimiento,
        }
        for lote in lotes
    ]
    return Response(data)
