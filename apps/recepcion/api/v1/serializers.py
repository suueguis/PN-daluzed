from decimal import Decimal
from rest_framework import serializers
from apps.catalogo.models import MateriaPrima, Presentacion, Proveedor
from apps.recepcion.models import OrdenCompra, DetalleOrdenCompra, RecepcionMercancia


class DetalleOrdenCompraSerializer(serializers.ModelSerializer):
    materia_prima_id = serializers.IntegerField(source='materia_prima.id', read_only=True)
    materia_prima_nombre = serializers.CharField(source='materia_prima.nombre', read_only=True)
    presentacion_id = serializers.IntegerField(source='presentacion.id', read_only=True)
    presentacion_nombre = serializers.CharField(source='presentacion.nombre', read_only=True)

    class Meta:
        model = DetalleOrdenCompra
        fields = [
            'id',
            'materia_prima_id', 'materia_prima_nombre',
            'presentacion_id', 'presentacion_nombre',
            'cantidad_presentacion',
        ]


class OrdenCompraSerializer(serializers.ModelSerializer):
    proveedor_id = serializers.PrimaryKeyRelatedField(
        queryset=Proveedor.objects.all(),
        source='proveedor',
        write_only=True,
    )
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    detalles = DetalleOrdenCompraSerializer(many=True, read_only=True)

    class Meta:
        model = OrdenCompra
        fields = [
            'id', 'proveedor_id', 'proveedor_nombre',
            'fecha_creacion', 'estado', 'usuario_creador',
            'detalles',
        ]
        read_only_fields = ['fecha_creacion', 'estado', 'usuario_creador']


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
    justificacion_vencimiento = serializers.CharField(required=False, default='', allow_blank=True)

    detalles = DetalleRecepcionSerializer(many=True, min_length=1)


class RecepcionMercanciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecepcionMercancia
        fields = ['id', 'orden_compra', 'fecha', 'usuario', 'confirmada', 'justificacion_vencimiento']