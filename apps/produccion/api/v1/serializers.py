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


class DesgloseLotelSerializer(serializers.Serializer):
    """Desglose opcional de cantidades por presentación en el LotePT."""
    cup_cake             = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    porcionada           = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    planchas             = serializers.IntegerField(required=False, allow_null=True)
    cantidades_por_talla = serializers.DictField(child=serializers.IntegerField(), required=False, default=dict)
    observacion          = serializers.CharField(required=False, default='', allow_blank=True)


class BatidoCreateSerializer(serializers.Serializer):
    producto_terminado_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductoTerminado.objects.all(), source='producto_terminado',
    )
    fecha_produccion = serializers.DateField()
    hora_inicio = serializers.TimeField()
    ingredientes = IngredienteSerializer(many=True, min_length=1)

    # ── Campos de seguimiento opcionales ──────────────────────────────
    numero_lote           = serializers.CharField(required=False, default='', allow_blank=True)
    observacion           = serializers.CharField(required=False, default='', allow_blank=True)
    fecha_recepcion_huevo = serializers.DateField(required=False, allow_null=True)
    desglose_lote         = DesgloseLotelSerializer(required=False)


class BatidoSerializer(serializers.ModelSerializer):
    producto_terminado_nombre = serializers.CharField(
        source='producto_terminado.nombre', read_only=True
    )

    class Meta:
        model = Batido
        fields = [
            'id', 'producto_terminado', 'producto_terminado_nombre',
            'fecha_produccion', 'hora_inicio', 'estado', 'usuario', 'fecha_registro',
            'numero_lote', 'observacion', 'fecha_recepcion_huevo',
        ]


class LoteProductoTerminadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoteProductoTerminado
        fields = [
            'id', 'batido', 'estado', 'cantidad',
            'fecha_produccion', 'fecha_vencimiento', 'fecha_despacho',
            'cup_cake', 'porcionada', 'planchas', 'cantidades_por_talla', 'observacion',
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
