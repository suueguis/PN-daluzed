# apps/inventario/api/v1/serializers.py
from decimal import Decimal
from rest_framework import serializers
from apps.inventario.models import Bodega, Lote, MovimientoInventario


class BodegaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bodega
        fields = ['id', 'nombre', 'tipo']


class LoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lote
        fields = ['id', 'materia_prima', 'bodega', 'cantidad', 'fecha_vencimiento', 'fecha_entrada']


class MovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoInventario
        fields = ['id', 'tipo', 'lote', 'bodega_origen', 'bodega_destino', 'cantidad', 'usuario', 'fecha', 'notas']


# ── Traslado ──────────────────────────────────────────────────────────────────

class TrasladoCreateSerializer(serializers.Serializer):
    lote_id = serializers.PrimaryKeyRelatedField(queryset=Lote.objects.all())
    bodega_destino = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all())
    cantidad = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))


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
