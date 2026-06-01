# apps/alertas/api/v1/views.py
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.alertas.models import Alerta
from apps.alertas.services import AlertaService
from apps.authentication.permissions import allow_roles
from apps.catalogo.models import MateriaPrima
from .serializers import AlertaSerializer

_ALR_READ  = ('ADMIN', 'GERENTE', 'PRODUCCION', 'INVENTARIO')
_ALR_WRITE = ('ADMIN', 'INVENTARIO', 'PRODUCCION')


@api_view(['GET'])
@permission_classes([allow_roles(*_ALR_READ)])
def alertas_activas(request):
    """Devuelve todas las alertas activas (cualquier tipo)."""
    alertas = Alerta.objects.filter(activa=True)
    return Response(AlertaSerializer(alertas, many=True).data)


@api_view(['POST'])
@permission_classes([allow_roles(*_ALR_WRITE)])
def resolver_alerta(request, alerta_id):
    """Marca una alerta como resuelta (RF-ALR-04)."""
    alerta = get_object_or_404(Alerta, pk=alerta_id)
    mensaje = request.data.get('mensaje', '')
    AlertaService.resolver(alerta, mensaje_resolucion=mensaje)
    return Response(AlertaSerializer(alerta).data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([allow_roles(*_ALR_READ)])
def alertas_reorden(request):
    """Evalúa stock vs reorden para todas las MP activas y devuelve las STOCK_BAJO."""
    for mp in MateriaPrima.objects.filter(activo=True):
        AlertaService.verificar_stock_reorden(mp)
    alertas = Alerta.objects.filter(tipo='STOCK_BAJO', activa=True)
    return Response(AlertaSerializer(alertas, many=True).data)


@api_view(['GET'])
@permission_classes([allow_roles(*_ALR_READ)])
def alertas_vencimiento(request):
    dias = int(request.query_params.get('dias', 7))
    AlertaService.verificar_vencimientos(dias_umbral=dias)
    alertas = Alerta.objects.filter(tipo='VENCIMIENTO_PROXIMO', activa=True)
    return Response(AlertaSerializer(alertas, many=True).data)


@api_view(['GET'])
@permission_classes([allow_roles(*_ALR_READ)])
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
