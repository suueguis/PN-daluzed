# apps/recepcion/models.py
from datetime import date
from django.db import models
from django.conf import settings
from apps.catalogo.models import MateriaPrima, Presentacion, Proveedor


class OrdenCompra(models.Model):
    ESTADO_CHOICES = [
        ('PENDIENTE',  'Pendiente'),
        ('RECIBIDA',   'Recibida'),
        ('CANCELADA',  'Cancelada'),
    ]
    proveedor = models.ForeignKey(
        Proveedor, on_delete=models.PROTECT, related_name='ordenes_compra'
    )
    fecha_creacion = models.DateField(default=date.today)
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='PENDIENTE')
    usuario_creador = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL,
        related_name='ordenes_creadas',
    )

    def __str__(self):
        return f"OC-{self.pk} | {self.proveedor} | {self.estado}"


class DetalleOrdenCompra(models.Model):
    orden = models.ForeignKey(
        OrdenCompra, on_delete=models.CASCADE, related_name='detalles'
    )
    materia_prima = models.ForeignKey(MateriaPrima, on_delete=models.PROTECT)
    presentacion = models.ForeignKey(Presentacion, on_delete=models.PROTECT)
    cantidad_presentacion = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.materia_prima} × {self.cantidad_presentacion} ({self.presentacion})"


class RecepcionMercancia(models.Model):
    orden_compra = models.ForeignKey(
        OrdenCompra, on_delete=models.PROTECT, related_name='recepciones'
    )
    fecha = models.DateField(default=date.today)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL,
        related_name='recepciones',
    )
    confirmada = models.BooleanField(default=True)
    justificacion_vencimiento = models.TextField(blank=True)

    def __str__(self):
        return f"Recepción #{self.pk} — OC {self.orden_compra_id} ({self.fecha})"
