# apps/recepcion/api/v1/serializers.py
from decimal import Decimal
from rest_framework import serializers
from apps.catalogo.models import MateriaPrima, Presentacion
from apps.recepcion.models import OrdenCompra, RecepcionMercancia


class DetalleRecepcionSerializer(serializers.Serializer):
    materia_prima_id = serializers.PrimaryKeyRelatedField(
        queryset=MateriaPrima.objects.all(), source='materia_prima'
    )
    presentacion_id = serializers.PrimaryKeyRelatedField(
        queryset=Presentacion.objects.all(), source='presentacion'
    )
    cantidad_presentacion = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.01')
    )
    fecha_vencimiento = serializers.DateField()
    numero_lote = serializers.CharField(max_length=50, required=False, default='')


class RecepcionCreateSerializer(serializers.Serializer):
    orden_compra_id = serializers.PrimaryKeyRelatedField(
        queryset=OrdenCompra.objects.filter(estado='PENDIENTE'),
        source='orden_compra',
    )
    justificacion_vencimiento = serializers.CharField(required=False, default='')
    detalles = DetalleRecepcionSerializer(many=True, min_length=1)


class RecepcionMercanciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecepcionMercancia
        fields = ['id', 'orden_compra', 'fecha', 'usuario', 'confirmada', 'justificacion_vencimiento']


class OrdenCompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrdenCompra
        fields = ['id', 'proveedor', 'fecha_creacion', 'estado', 'usuario_creador']
