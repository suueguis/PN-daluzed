from rest_framework import serializers

from apps.catalogo.models import (
    UnidadMedida,
    MateriaPrima,
    Presentacion,
    Proveedor,
    ProductoTerminado,
)


class UnidadMedidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnidadMedida
        fields = ['id', 'nombre', 'simbolo', 'activo']


class PresentacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Presentacion
        fields = [
            'id', 'nombre', 'materia_prima', 'unidad_medida',
            'factor_conversion', 'costo', 'activo',
        ]


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = ['id', 'nombre', 'contacto', 'telefono', 'email', 'activo']


class MateriaPrimaSerializer(serializers.ModelSerializer):
    """
    Serializer de escritura acepta unidad_medida como ID (FK).
    Los campos de detalle y relaciones son de solo lectura.
    """

    unidad_medida_detalle = UnidadMedidaSerializer(source='unidad_medida', read_only=True)
    proveedores = ProveedorSerializer(many=True, read_only=True)
    presentaciones = PresentacionSerializer(many=True, read_only=True)

    class Meta:
        model = MateriaPrima
        fields = [
            'id', 'nombre',
            'unidad_medida', 'unidad_medida_detalle',
            'punto_reorden', 'dias_minimos_vencimiento',
            'categoria', 'condicion_almacenamiento',
            'activo', 'proveedores', 'presentaciones',
        ]


class ProductoTerminadoSerializer(serializers.ModelSerializer):
    unidad_medida_detalle = UnidadMedidaSerializer(source='unidad_medida', read_only=True)

    class Meta:
        model = ProductoTerminado
        fields = [
            'id', 'codigo', 'nombre',
            'vida_util_dias', 'unidad_medida', 'unidad_medida_detalle',
            'activo',
        ]
        read_only_fields = ['codigo']
