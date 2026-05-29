# apps/inventario/models.py
from datetime import date
from django.db import models
from django.conf import settings
from apps.catalogo.models import MateriaPrima, Proveedor


class Bodega(models.Model):
    TIPO_CHOICES = [
        ('PRINCIPAL', 'Bodega Principal'),
        ('PDP', 'Punto de Producción'),
    ]
    nombre = models.CharField(max_length=100, unique=True)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)

    def __str__(self):
        return f"{self.nombre} ({self.tipo})"


class Lote(models.Model):
    materia_prima = models.ForeignKey(
        MateriaPrima, on_delete=models.PROTECT, related_name='lotes'
    )
    bodega = models.ForeignKey(
        Bodega, on_delete=models.PROTECT, related_name='lotes'
    )
    proveedor = models.ForeignKey(
        Proveedor, null=True, blank=True, on_delete=models.SET_NULL, related_name='lotes'
    )
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    fecha_vencimiento = models.DateField()
    fecha_entrada = models.DateField(default=date.today)

    class Meta:
        ordering = ['fecha_vencimiento']

    def __str__(self):
        return f"Lote {self.pk} — {self.materia_prima} / {self.bodega} ({self.cantidad})"


class MovimientoInventario(models.Model):
    TIPO_CHOICES = [
        ('RECEPCION',  'Recepción'),
        ('TRASLADO',   'Traslado BP→PDP'),
        ('CONSUMO',    'Consumo en producción'),
        ('DEVOLUCION', 'Devolución a proveedor'),
        ('DESCARTE',   'Descarte por vencimiento'),
    ]
    tipo = models.CharField(max_length=15, choices=TIPO_CHOICES)
    lote = models.ForeignKey(Lote, on_delete=models.PROTECT, related_name='movimientos')
    bodega_origen = models.ForeignKey(
        Bodega, null=True, blank=True, on_delete=models.PROTECT, related_name='movimientos_salida'
    )
    bodega_destino = models.ForeignKey(
        Bodega, null=True, blank=True, on_delete=models.PROTECT, related_name='movimientos_entrada'
    )
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='movimientos'
    )
    fecha = models.DateTimeField(auto_now_add=True)
    notas = models.TextField(blank=True)

    class Meta:
        ordering = ['fecha']

    def __str__(self):
        return f"{self.tipo} — Lote {self.lote_id} — {self.cantidad}"
