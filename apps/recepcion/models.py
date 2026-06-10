# apps/recepcion/models.py
from datetime import date
from django.db import models
from django.conf import settings
from apps.catalogo.models import MateriaPrima, Presentacion, Proveedor


class OrdenCompra(models.Model):
    ESTADO_CHOICES = [
        ('PENDIENTE',  'Pendiente'),
        ('PARCIAL',    'Parcial'),
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
    cantidad_recibida = models.DecimalField(max_digits=10, decimal_places=2, default=0)

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

    # ── Campos de inspección de calidad (Planilla de entrada MP) ──────
    fecha_ingreso_planta      = models.DateField(null=True, blank=True)
    rotulacion_adecuada       = models.BooleanField(null=True, blank=True)
    libre_material_extrano    = models.BooleanField(null=True, blank=True)
    sin_aperturas_rupturas    = models.BooleanField(null=True, blank=True)
    libre_infestacion         = models.BooleanField(null=True, blank=True)
    accion_correctiva         = models.TextField(blank=True)
    cantidad_rechazada        = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    producto_aplicado         = models.TextField(blank=True)
    observacion               = models.TextField(blank=True)
    responsable_proceso       = models.CharField(max_length=150, blank=True)
    responsable_verificacion  = models.CharField(max_length=150, blank=True)

    def __str__(self):
        return f"Recepción #{self.pk} — OC {self.orden_compra_id} ({self.fecha})"
