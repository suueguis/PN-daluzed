# apps/alertas/api/v1/serializers.py
from rest_framework import serializers

from apps.alertas.models import Alerta


class AlertaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alerta
        fields = [
            'id', 'tipo', 'materia_prima', 'bodega', 'lote',
            'activa', 'mensaje', 'fecha_creacion', 'fecha_resolucion',
        ]
