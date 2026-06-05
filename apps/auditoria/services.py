from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.http import HttpRequest


def get_client_ip(request: HttpRequest) -> str | None:
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def registrar_operacion(
    usuario,
    accion: str,
    detalle: dict,
    ip: str | None = None,
) -> None:
    from .models import BitacoraOperacion
    try:
        BitacoraOperacion.objects.create(
            usuario=usuario,
            accion=accion,
            detalle=detalle,
            ip=ip,
        )
    except Exception:
        pass
