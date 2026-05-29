# apps/alertas/models.py
from django.db import models

from apps.catalogo.models import MateriaPrima
from apps.inventario.models import Bodega, Lote


class Alerta(models.Model):
    TIPO_CHOICES = [
        ('STOCK_BAJO',          'Stock por debajo del punto de reorden'),
        ('VENCIMIENTO_PROXIMO', 'Vencimiento próximo'),
        ('EN_ESPERA_PENDIENTE', 'Lote PT pendiente de despacho'),
    ]
    tipo = models.CharField(max_length=25, choices=TIPO_CHOICES)
    materia_prima = models.ForeignKey(
        MateriaPrima, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='alertas',
    )
    bodega = models.ForeignKey(
        Bodega, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='alertas',
    )
    lote = models.ForeignKey(
        Lote, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='alertas',
    )
    activa = models.BooleanField(default=True)
    mensaje = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_resolucion = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"[{self.tipo}] {self.mensaje[:40]}"
