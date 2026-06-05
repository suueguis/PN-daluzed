# apps/recepcion/api/v1/serializers.py
from decimal import Decimal
from rest_framework import serializers
from apps.catalogo.models import MateriaPrima, Presentacion, Proveedor
from apps.recepcion.models import OrdenCompra, RecepcionMercancia, DetalleOrdenCompra


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
        queryset=OrdenCompra.objects.filter(estado__in=['PENDIENTE', 'PARCIAL']),
        source='orden_compra',
    )
    justificacion_vencimiento = serializers.CharField(required=False, default='')
    detalles = DetalleRecepcionSerializer(many=True, min_length=1)


class RecepcionMercanciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecepcionMercancia
        fields = ['id', 'orden_compra', 'fecha', 'usuario', 'confirmada', 'justificacion_vencimiento']


class DetalleOrdenCompraSerializer(serializers.ModelSerializer):
    materia_prima_nombre = serializers.CharField(source='materia_prima.nombre', read_only=True)
    saldo_pendiente = serializers.SerializerMethodField()

    class Meta:
        model = DetalleOrdenCompra
        fields = ['id', 'materia_prima', 'materia_prima_nombre', 'presentacion',
                  'cantidad_presentacion', 'cantidad_recibida', 'saldo_pendiente']

    def get_saldo_pendiente(self, obj):
        return max(obj.cantidad_presentacion - obj.cantidad_recibida, Decimal('0'))


class OrdenCompraSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    detalles = DetalleOrdenCompraSerializer(many=True, read_only=True)

    class Meta:
        model = OrdenCompra
        fields = ['id', 'proveedor', 'proveedor_nombre', 'fecha_creacion', 'estado', 'usuario_creador', 'detalles']

    def to_internal_value(self, data):
        if 'proveedor_id' in data and 'proveedor' not in data:
            data = {**data, 'proveedor': data['proveedor_id']}
        return super().to_internal_value(data)

    def validate_proveedor(self, value: Proveedor) -> Proveedor:
        if not value.activo:
            raise serializers.ValidationError('Proveedor inactivo.')
        return value
