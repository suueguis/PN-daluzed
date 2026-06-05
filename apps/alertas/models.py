# apps/alertas/models.py
from django.db import models

from apps.catalogo.models import MateriaPrima
from apps.inventario.models import Bodega, Lote


class ConfiguracionAlerta(models.Model):
    whatsapp_numero = models.CharField(
        max_length=20, blank=True,
        help_text='Número de WhatsApp (incluir código país, ej: +573001234567)'
    )
    email_gerencia = models.EmailField(blank=True)
    email_produccion = models.EmailField(blank=True)
    dias_umbral_vencimiento = models.PositiveIntegerField(
        default=7,
        help_text='Días antes del vencimiento para generar alerta'
    )

    class Meta:
        verbose_name_plural = 'Configuración de Alertas'

    def __str__(self):
        return 'Configuración Global de Alertas'


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
