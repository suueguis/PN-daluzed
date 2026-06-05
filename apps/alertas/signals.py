from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.inventario.models import Lote
from .services import AlertaService


@receiver(post_save, sender=Lote)
def lote_guardado(sender, instance: Lote, **kwargs) -> None:
    """
    Dispara verificación de stock bajo cada vez que se guarda un Lote.
    Solo evalúa la materia prima del lote guardado para mantenerlo eficiente.
    """
    AlertaService.verificar_stock_reorden(instance.materia_prima)
