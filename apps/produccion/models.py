# apps/produccion/models.py
from datetime import date
from django.db import models
from django.conf import settings

from apps.catalogo.models import ProductoTerminado, MateriaPrima
from apps.inventario.models import Lote


class Batido(models.Model):
    ESTADO_CHOICES = [
        ('EN_PROCESO', 'En proceso'),
        ('COMPLETADO', 'Completado'),
        ('CANCELADO',  'Cancelado'),
    ]
    producto_terminado = models.ForeignKey(
        ProductoTerminado, on_delete=models.PROTECT, related_name='batidos'
    )
    fecha_produccion = models.DateField(default=date.today)
    hora_inicio = models.TimeField()
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='EN_PROCESO')
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='batidos',
    )
    fecha_registro = models.DateTimeField(auto_now_add=True)

    # ── Campos de seguimiento (Planilla de producción) ────────────────
    numero_lote           = models.CharField(max_length=50, blank=True)
    observacion           = models.TextField(blank=True)
    fecha_recepcion_huevo = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-fecha_produccion', 'hora_inicio']

    def __str__(self):
        return f"Batido #{self.pk} — {self.producto_terminado} ({self.estado})"


class DetalleBatido(models.Model):
    """Materia prima consumida en un batido (vinculada a un lote específico)."""
    batido = models.ForeignKey(
        Batido, on_delete=models.CASCADE, related_name='detalles'
    )
    materia_prima = models.ForeignKey(MateriaPrima, on_delete=models.PROTECT)
    lote = models.ForeignKey(Lote, on_delete=models.PROTECT, related_name='consumos')
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.materia_prima} × {self.cantidad} (Batido {self.batido_id})"


class LoteProductoTerminado(models.Model):
    ESTADO_CHOICES = [
        ('EN_ESPERA',         'En espera'),
        ('EN_PUNTO_DE_VENTA', 'En punto de venta'),
    ]
    batido = models.ForeignKey(
        Batido, on_delete=models.CASCADE, related_name='lotes_pt'
    )
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='EN_ESPERA')
    cantidad = models.DecimalField(max_digits=12, decimal_places=2)
    fecha_produccion = models.DateField()
    fecha_vencimiento = models.DateField()
    fecha_despacho = models.DateField(null=True, blank=True)

    # ── Desglose por presentación (Planilla de producción) ────────────
    cup_cake             = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    porcionada           = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    planchas             = models.PositiveIntegerField(null=True, blank=True)
    cantidades_por_talla = models.JSONField(default=dict, blank=True)
    observacion          = models.TextField(blank=True)

    class Meta:
        ordering = ['fecha_produccion']  # FIFO para despacho

    def __str__(self):
        return f"LotePT #{self.pk} — Batido {self.batido_id} ({self.estado})"


class MovimientoCompensatorio(models.Model):
    """Ajuste manual para corregir registros previos (RF-PROD-08).

    Inmutable: solo se permite crear y consultar.
    """
    tipo_afectado = models.CharField(max_length=50)
    id_afectado = models.PositiveIntegerField()
    datos_originales = models.JSONField(default=dict, blank=True)
    datos_corregidos = models.JSONField(default=dict, blank=True)
    descripcion = models.TextField()
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='compensatorios',
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"Compensatorio #{self.pk} — {self.tipo_afectado}:{self.id_afectado}"
