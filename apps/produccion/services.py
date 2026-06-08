# apps/produccion/services.py
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

from apps.catalogo.models import MateriaPrima
from apps.inventario.models import Bodega, Lote
from .models import (
    Batido, DetalleBatido, LoteProductoTerminado, MovimientoCompensatorio,
)


class StockInsuficienteError(Exception):
    """Stock insuficiente para un ingrediente del batido (RF-PROD-03)."""


class LimiteBatidosError(Exception):
    """Más de 2 batidos simultáneos del mismo producto (RF-PROD-04)."""


class DespachoIrreversibleError(Exception):
    """Intento de revertir un lote ya despachado (RF-PROD-07)."""


MAX_BATIDOS_SIMULTANEOS = 2


class ProduccionService:

    # ── Batido ────────────────────────────────────────────────────────
    @staticmethod
    @transaction.atomic
    def registrar_batido(producto_terminado, fecha_produccion, hora_inicio,
                         ingredientes, usuario,
                         numero_lote='', observacion='', fecha_recepcion_huevo=None,
                         desglose_lote=None):
        """Crea un Batido COMPLETADO + LoteProductoTerminado EN_ESPERA.

        Valida límite de batidos simultáneos del mismo producto y stock
        suficiente en los lotes específicos indicados. Operación atómica.
        """
        # Límite de 2 batidos simultáneos por producto.
        en_proceso = Batido.objects.filter(
            producto_terminado=producto_terminado, estado='EN_PROCESO',
        ).count()
        if en_proceso >= MAX_BATIDOS_SIMULTANEOS:
            raise LimiteBatidosError(
                f'No se permiten más de {MAX_BATIDOS_SIMULTANEOS} batidos '
                f'simultáneos en estado EN_PROCESO para {producto_terminado.nombre}.'
            )

        # Validar stock para cada ingrediente antes de descontar.
        for ing in ingredientes:
            lote = ing['lote']
            cantidad = Decimal(str(ing['cantidad']))
            if lote.cantidad < cantidad:
                faltante = cantidad - lote.cantidad
                raise StockInsuficienteError(
                    f"Stock insuficiente para '{lote.materia_prima.nombre}': "
                    f"faltante {faltante} (disponible {lote.cantidad}, "
                    f"requerido {cantidad})."
                )

        batido = Batido.objects.create(
            producto_terminado=producto_terminado,
            fecha_produccion=fecha_produccion,
            hora_inicio=hora_inicio,
            estado='COMPLETADO',
            usuario=usuario,
            numero_lote=numero_lote,
            observacion=observacion,
            fecha_recepcion_huevo=fecha_recepcion_huevo,
        )

        total_ingredientes = Decimal('0')
        for ing in ingredientes:
            lote = ing['lote']
            cantidad = Decimal(str(ing['cantidad']))
            lote.cantidad -= cantidad
            lote.save()
            DetalleBatido.objects.create(
                batido=batido,
                materia_prima=ing['materia_prima'],
                lote=lote,
                cantidad=cantidad,
            )
            total_ingredientes += cantidad

        desglose = desglose_lote or {}
        LoteProductoTerminado.objects.create(
            batido=batido,
            estado='EN_ESPERA',
            cantidad=total_ingredientes or Decimal('1'),
            fecha_produccion=fecha_produccion,
            fecha_vencimiento=fecha_produccion + timedelta(
                days=producto_terminado.vida_util_dias
            ),
            cup_cake=desglose.get('cup_cake'),
            porcionada=desglose.get('porcionada'),
            planchas=desglose.get('planchas'),
            cantidades_por_talla=desglose.get('cantidades_por_talla', {}),
            observacion=desglose.get('observacion', ''),
        )
        return batido

    # ── Sugerencia FEFO de ingredientes ───────────────────────────────
    @staticmethod
    def sugerir_fefo_ingredientes(producto_terminado=None):
        """FEFO: lote por MP en bodega PDP con vencimiento más próximo.

        Sin recetas en sistema, devolvemos sugerencias por cada MP con
        stock en PDP. El producto se pasa por compatibilidad de API.
        """
        bodega_pdp = Bodega.objects.filter(tipo='PDP').first()
        if not bodega_pdp:
            return []
        sugerencias = []
        mps_con_stock = (
            MateriaPrima.objects
            .filter(lotes__bodega=bodega_pdp, lotes__cantidad__gt=0)
            .distinct()
        )
        for mp in mps_con_stock:
            lote = (
                Lote.objects
                .filter(materia_prima=mp, bodega=bodega_pdp, cantidad__gt=0)
                .order_by('fecha_vencimiento')
                .first()
            )
            if lote:
                sugerencias.append({
                    'materia_prima_id': mp.id,
                    'materia_prima_nombre': mp.nombre,
                    'lote_id': lote.id,
                    'fecha_vencimiento': lote.fecha_vencimiento,
                    'cantidad_disponible': lote.cantidad,
                })
        return sugerencias

    # ── Sugerencia FIFO para despacho ─────────────────────────────────
    @staticmethod
    def sugerir_fifo_despacho(producto_terminado):
        """Lote PT más antiguo (fecha_produccion) en EN_ESPERA del producto."""
        return (
            LoteProductoTerminado.objects
            .filter(
                batido__producto_terminado=producto_terminado,
                estado='EN_ESPERA',
            )
            .order_by('fecha_produccion', 'id')
            .first()
        )

    # ── Despacho ──────────────────────────────────────────────────────
    @staticmethod
    @transaction.atomic
    def despachar_lote(lote_pt, usuario=None):
        if lote_pt.estado == 'EN_PUNTO_DE_VENTA':
            raise DespachoIrreversibleError(
                'El lote ya fue despachado y no puede revertirse.'
            )
        if lote_pt.estado != 'EN_ESPERA':
            raise DespachoIrreversibleError(
                f'Estado inválido para despacho: {lote_pt.estado}.'
            )
        lote_pt.estado = 'EN_PUNTO_DE_VENTA'
        lote_pt.fecha_despacho = date.today()
        lote_pt.save()
        return lote_pt

    # ── Compensatorio ─────────────────────────────────────────────────
    @staticmethod
    @transaction.atomic
    def registrar_compensatorio(tipo_afectado, id_afectado, datos_originales,
                                datos_corregidos, descripcion, usuario):
        """Aplica el ajuste sobre la entidad afectada y registra trazabilidad.

        Soporta tipo_afectado='Lote' con clave 'cantidad' en datos_corregidos.
        """
        if tipo_afectado == 'Lote' and 'cantidad' in datos_corregidos:
            lote = Lote.objects.get(pk=id_afectado)
            lote.cantidad = Decimal(str(datos_corregidos['cantidad']))
            lote.save()
        return MovimientoCompensatorio.objects.create(
            tipo_afectado=tipo_afectado,
            id_afectado=id_afectado,
            datos_originales=datos_originales,
            datos_corregidos=datos_corregidos,
            descripcion=descripcion,
            usuario=usuario,
        )

    # ── Jornadas ──────────────────────────────────────────────────────
    @staticmethod
    def jornada_del_dia(fecha):
        qs = Batido.objects.filter(fecha_produccion=fecha)
        return {
            'fecha': fecha,
            'total_batidos': qs.count(),
            'batidos_completados': qs.filter(estado='COMPLETADO').count(),
            'batidos_en_proceso': qs.filter(estado='EN_PROCESO').count(),
        }
