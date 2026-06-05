from django.db import models
from django.conf import settings


class BitacoraOperacion(models.Model):
    ACCIONES = [
        ('LOGIN',             'Login'),
        ('LOGOUT',            'Logout'),
        ('RECEPCION_CREADA',  'Recepción creada'),
        ('TRASLADO',          'Traslado'),
        ('BATIDO_CREADO',     'Batido creado'),
        ('COMPENSATORIO',     'Compensatorio'),
        ('DESPACHO',          'Despacho'),
        ('USUARIO_DESACTIVADO', 'Usuario desactivado'),
    ]

    usuario  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='bitacora',
    )
    accion   = models.CharField(max_length=50, choices=ACCIONES)
    detalle  = models.JSONField(default=dict)
    ip       = models.GenericIPAddressField(null=True, blank=True)
    fecha    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self) -> str:
        return f'{self.fecha:%Y-%m-%d %H:%M} | {self.accion} | {self.usuario}'
