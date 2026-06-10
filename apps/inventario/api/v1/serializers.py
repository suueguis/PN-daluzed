# apps/inventario/api/v1/serializers.py
from decimal import Decimal
from rest_framework import serializers
from apps.inventario.models import Bodega, ZonaBodega, Lote, MovimientoInventario


class ZonaBodegaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZonaBodega
        fields = ['id', 'bodega', 'nombre', 'descripcion']


class BodegaSerializer(serializers.ModelSerializer):
    zonas = ZonaBodegaSerializer(many=True, read_only=True)

    class Meta:
        model = Bodega
        fields = ['id', 'nombre', 'tipo', 'zonas']


class LoteSerializer(serializers.ModelSerializer):
    materia_prima_nombre = serializers.CharField(source='materia_prima.nombre', read_only=True)
    bodega_nombre = serializers.CharField(source='bodega.nombre', read_only=True)
    bodega_tipo = serializers.CharField(source='bodega.tipo', read_only=True)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True, allow_null=True, default=None)

    class Meta:
        model = Lote
        fields = [
            'id', 'numero_lote',
            'materia_prima', 'materia_prima_nombre',
            'bodega', 'bodega_nombre', 'bodega_tipo',
            'cantidad', 'fecha_vencimiento', 'fecha_entrada',
            'proveedor_nombre',
        ]


class MovimientoSerializer(serializers.ModelSerializer):
    bodega_origen_nombre = serializers.CharField(source='bodega_origen.nombre', read_only=True, allow_null=True)
    bodega_destino_nombre = serializers.CharField(source='bodega_destino.nombre', read_only=True, allow_null=True)

    class Meta:
        model = MovimientoInventario
        fields = [
            'id', 'tipo', 'lote',
            'bodega_origen', 'bodega_origen_nombre',
            'bodega_destino', 'bodega_destino_nombre',
            'cantidad', 'usuario', 'fecha', 'notas',
        ]


# ── Kardex ───────────────────────────────────────────────────────────────────

class KardexRowSerializer(serializers.ModelSerializer):
    bodega_origen_nombre = serializers.CharField(source='bodega_origen.nombre', read_only=True, allow_null=True)
    bodega_destino_nombre = serializers.CharField(source='bodega_destino.nombre', read_only=True, allow_null=True)
    numero_lote = serializers.CharField(source='lote.numero_lote', read_only=True, allow_null=True)
    usuario_email = serializers.CharField(source='usuario.email', read_only=True, allow_null=True)
    saldo = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = MovimientoInventario
        fields = [
            'id', 'fecha', 'tipo',
            'numero_lote', 'lote',
            'bodega_origen', 'bodega_origen_nombre',
            'bodega_destino', 'bodega_destino_nombre',
            'cantidad', 'saldo', 'usuario_email', 'notas',
        ]


# ── Traslado ──────────────────────────────────────────────────────────────────

class TrasladoCreateSerializer(serializers.Serializer):
    lote_id = serializers.PrimaryKeyRelatedField(queryset=Lote.objects.all())
    bodega_destino = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all())
    cantidad = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    notas = serializers.CharField(required=False, default='', allow_blank=True, max_length=500)


# ── Devolución ────────────────────────────────────────────────────────────────

class DevolucionCreateSerializer(serializers.Serializer):
    from apps.catalogo.models import Proveedor
    lote_id = serializers.PrimaryKeyRelatedField(queryset=Lote.objects.all())
    proveedor_id = serializers.PrimaryKeyRelatedField(queryset=Proveedor.objects.all())
    motivo = serializers.CharField(max_length=500)


# ── Descarte ──────────────────────────────────────────────────────────────────

class DescarteCreateSerializer(serializers.Serializer):
    lote_id = serializers.PrimaryKeyRelatedField(queryset=Lote.objects.all())
    motivo = serializers.CharField(max_length=500)
