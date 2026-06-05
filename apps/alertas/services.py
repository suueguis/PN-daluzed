# apps/alertas/services.py
"""Generación y envío de alertas (RF-ALR-01..05).

Los siguientes símbolos se exponen a nivel de módulo para permitir su
sustitución desde los tests vía ``unittest.mock.patch``:

- ``channel_layer``  → Django Channels (WebSocket)
- ``twilio_client``  → cliente Twilio (WhatsApp)
- ``send_mail``      → helper de ``django.core.mail``
"""
from datetime import date, timedelta

from django.core.mail import send_mail  # noqa: F401  (patched en tests)
from django.db.models import Sum
from django.utils import timezone

from typing import Optional

from apps.catalogo.models import MateriaPrima
from apps.inventario.models import Bodega, Lote
from .models import Alerta, ConfiguracionAlerta


# Channels y Twilio son opcionales en este momento: dejamos referencias
# nulas a nivel de módulo para que los tests puedan hacer patch sobre ellas.
channel_layer = None
twilio_client = None


class AlertaService:

    @staticmethod
    def _get_config() -> Optional['ConfiguracionAlerta']:
        return ConfiguracionAlerta.objects.first()

    # ── Stock bajo (RF-ALR-01) ───────────────────────────────────────
    @staticmethod
    def verificar_stock_reorden(materia_prima, enviar_ws=False):
        """Crea STOCK_BAJO si el stock de la MP en BP cae bajo el reorden.

        Sólo evalúa stock en Bodega Principal (PDP queda excluida).
        Deduplicación: no se vuelve a crear si ya existe una alerta activa
        para la misma MP en BP.
        """
        bodega_principal = Bodega.objects.filter(tipo='PRINCIPAL').first()
        if not bodega_principal:
            return None
        stock_bp = (
            Lote.objects
            .filter(materia_prima=materia_prima, bodega=bodega_principal)
            .aggregate(total=Sum('cantidad'))['total']
        ) or 0
        if stock_bp >= materia_prima.punto_reorden:
            return None
        ya_existe = Alerta.objects.filter(
            tipo='STOCK_BAJO',
            materia_prima=materia_prima,
            bodega=bodega_principal,
            activa=True,
        ).exists()
        if ya_existe:
            return None
        alerta = Alerta.objects.create(
            tipo='STOCK_BAJO',
            materia_prima=materia_prima,
            bodega=bodega_principal,
            activa=True,
            mensaje=(
                f'Stock de {materia_prima.nombre} ({stock_bp}) por debajo '
                f'del punto de reorden ({materia_prima.punto_reorden}).'
            ),
        )
        if enviar_ws:
            AlertaService._enviar_websocket(alerta)
        return alerta

    # ── Vencimiento próximo (RF-ALR-02) ──────────────────────────────
    @staticmethod
    def verificar_vencimientos(dias_umbral: Optional[int] = None):
        if dias_umbral is None:
            config = AlertaService._get_config()
            dias_umbral = config.dias_umbral_vencimiento if config else 7
        hoy = date.today()
        fecha_corte = hoy + timedelta(days=dias_umbral)
        lotes = Lote.objects.filter(
            fecha_vencimiento__gte=hoy,
            fecha_vencimiento__lte=fecha_corte,
            cantidad__gt=0,
        )
        creadas = []
        for lote in lotes:
            ya_existe = Alerta.objects.filter(
                tipo='VENCIMIENTO_PROXIMO',
                materia_prima=lote.materia_prima,
                lote=lote,
                activa=True,
            ).exists()
            if ya_existe:
                continue
            dias_restantes = (lote.fecha_vencimiento - hoy).days
            alerta = Alerta.objects.create(
                tipo='VENCIMIENTO_PROXIMO',
                materia_prima=lote.materia_prima,
                bodega=lote.bodega,
                lote=lote,
                activa=True,
                mensaje=(
                    f'Lote de {lote.materia_prima.nombre} vence en '
                    f'{dias_restantes} días.'
                ),
            )
            creadas.append(alerta)
        return creadas

    # ── EN_ESPERA pendiente (RF-ALR-03) ──────────────────────────────
    @staticmethod
    def verificar_lotes_en_espera(horas_umbral=24):
        from apps.produccion.models import LoteProductoTerminado
        dias = horas_umbral / 24
        fecha_corte = date.today() - timedelta(days=dias)
        lotes = LoteProductoTerminado.objects.filter(
            estado='EN_ESPERA',
            fecha_produccion__lt=fecha_corte,
        )
        creadas = []
        for lote_pt in lotes:
            ya_existe = Alerta.objects.filter(
                tipo='EN_ESPERA_PENDIENTE',
                activa=True,
                mensaje__contains=f'LotePT #{lote_pt.id}',
            ).exists()
            if ya_existe:
                continue
            alerta = Alerta.objects.create(
                tipo='EN_ESPERA_PENDIENTE',
                activa=True,
                mensaje=(
                    f'LotePT #{lote_pt.id} de '
                    f'{lote_pt.batido.producto_terminado.nombre} '
                    f'lleva más de {horas_umbral} horas en EN_ESPERA.'
                ),
            )
            creadas.append(alerta)
        return creadas

    # ── Resolución ───────────────────────────────────────────────────
    @staticmethod
    def resolver(alerta, mensaje_resolucion=''):
        alerta.activa = False
        alerta.fecha_resolucion = timezone.now()
        if mensaje_resolucion:
            alerta.mensaje = f'{alerta.mensaje}\nResuelta: {mensaje_resolucion}'
        alerta.save()
        return alerta

    # ── Envío por WebSocket (RF-ALR-05) ──────────────────────────────
    @staticmethod
    def _enviar_websocket(alerta):
        if channel_layer is None:
            return
        channel_layer.group_send(
            'alertas',
            {
                'type': 'alerta.nueva',
                'alerta_id': alerta.id,
                'tipo': alerta.tipo,
                'mensaje': alerta.mensaje,
            },
        )

    # ── Envío por WhatsApp (RF-ALR-02 — Twilio) ──────────────────────
    @staticmethod
    def enviar_whatsapp(
        alerta,
        destinatario: Optional[str] = None,
        remitente: str = '+14155238886',
    ):
        if destinatario is None:
            config = AlertaService._get_config()
            destinatario = (
                config.whatsapp_numero
                if config and config.whatsapp_numero
                else '+573000000000'
            )
        nombre_mp = alerta.materia_prima.nombre if alerta.materia_prima else ''
        body = f'[Daluzed] {alerta.tipo} — {nombre_mp}: {alerta.mensaje}'
        return twilio_client.messages.create(
            to=f'whatsapp:{destinatario}',
            from_=f'whatsapp:{remitente}',
            body=body,
        )

    # ── Envío por email (RF-ALR-02 — SMTP) ───────────────────────────
    @staticmethod
    def enviar_email(alerta, destinatario: Optional[str] = None):
        config = AlertaService._get_config()
        if destinatario is None:
            destinatario = config.email_gerencia if config and config.email_gerencia else ''
        nombre_mp = alerta.materia_prima.nombre if alerta.materia_prima else 'inventario'
        subject = f'Alerta de {nombre_mp} — {alerta.tipo}'
        body = alerta.mensaje
        return send_mail(
            subject,
            body,
            'noreply@daluzed.com',
            [destinatario],
        )

    # ── Notificación multi-canal (RF-ALR-05) ─────────────────────────
    @staticmethod
    def notificar_todos(alerta) -> dict:
        """Send alert via all configured channels (WhatsApp + email)."""
        config = AlertaService._get_config()
        results: dict = {}
        if config and config.whatsapp_numero and twilio_client is not None:
            results['whatsapp'] = AlertaService.enviar_whatsapp(alerta, config.whatsapp_numero)
        destinatarios = [
            addr for addr in [
                config.email_gerencia if config else '',
                config.email_produccion if config else '',
            ] if addr
        ]
        for addr in destinatarios:
            AlertaService.enviar_email(alerta, addr)
        results['emails'] = destinatarios
        return results
