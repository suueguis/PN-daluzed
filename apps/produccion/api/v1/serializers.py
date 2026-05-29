# apps/produccion/api/v1/serializers.py
from decimal import Decimal
from rest_framework import serializers

from apps.catalogo.models import MateriaPrima, ProductoTerminado
from apps.inventario.models import Lote
from apps.produccion.models import (
    Batido, LoteProductoTerminado, MovimientoCompensatorio,
)


class IngredienteSerializer(serializers.Serializer):
    materia_prima_id = serializers.PrimaryKeyRelatedField(
        queryset=MateriaPrima.objects.all(), source='materia_prima',
    )
    lote_id = serializers.PrimaryKeyRelatedField(
        queryset=Lote.objects.all(), source='lote',
    )
    cantidad = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.01'),
    )


class BatidoCreateSerializer(serializers.Serializer):
    producto_terminado_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductoTerminado.objects.all(), source='producto_terminado',
    )
    fecha_produccion = serializers.DateField()
    hora_inicio = serializers.TimeField()
    ingredientes = IngredienteSerializer(many=True, min_length=1)


class BatidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Batido
        fields = [
            'id', 'producto_terminado', 'fecha_produccion', 'hora_inicio',
            'estado', 'usuario', 'fecha_registro',
        ]


class LoteProductoTerminadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoteProductoTerminado
        fields = [
            'id', 'batido', 'estado', 'cantidad',
            'fecha_produccion', 'fecha_vencimiento', 'fecha_despacho',
        ]


class MovimientoCompensatorioCreateSerializer(serializers.Serializer):
    tipo_afectado = serializers.CharField(max_length=50)
    id_afectado = serializers.IntegerField()
    datos_originales = serializers.JSONField()
    datos_corregidos = serializers.JSONField()
    descripcion = serializers.CharField()


class MovimientoCompensatorioSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoCompensatorio
        fields = [
            'id', 'tipo_afectado', 'id_afectado', 'datos_originales',
            'datos_corregidos', 'descripcion', 'usuario', 'fecha',
        ]
