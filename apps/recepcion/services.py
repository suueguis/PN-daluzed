# apps/recepcion/services.py
from datetime import date
from django.db import transaction

from apps.inventario.models import Bodega, Lote, MovimientoInventario
from .models import OrdenCompra, RecepcionMercancia, DetalleOrdenCompra


class VidaUtilInsuficienteError(Exception):
    pass


class RecepcionService:

    @staticmethod
    @transaction.atomic
    def registrar_recepcion(orden_compra, detalles, usuario,
                            justificacion_vencimiento='', campos_inspeccion=None):
        hoy = date.today()

        # Validate each detail's expiry against dias_minimos_vencimiento
        for d in detalles:
            mp = d['materia_prima']
            dias_minimos = mp.dias_minimos_vencimiento
            if dias_minimos:
                dias_restantes = (d['fecha_vencimiento'] - hoy).days
                if dias_restantes < dias_minimos and not justificacion_vencimiento:
                    raise VidaUtilInsuficienteError(
                        f"Vida útil insuficiente para '{mp.nombre}': "
                        f"quedan {dias_restantes} días pero se requieren "
                        f"{dias_minimos} (dias_minimos_vencimiento). "
                        f"Provee justificacion_vencimiento para continuar."
                    )

        bodega_principal = Bodega.objects.filter(tipo='PRINCIPAL').first()

        for d in detalles:
            cantidad_base = d['cantidad_presentacion'] * d['presentacion'].factor_conversion
            lote = Lote.objects.create(
                materia_prima=d['materia_prima'],
                bodega=bodega_principal,
                cantidad=cantidad_base,
                fecha_vencimiento=d['fecha_vencimiento'],
                fecha_entrada=hoy,
                numero_lote=d.get('numero_lote', ''),
                proveedor=orden_compra.proveedor,
            )
            MovimientoInventario.objects.create(
                tipo='RECEPCION',
                lote=lote,
                bodega_destino=bodega_principal,
                cantidad=cantidad_base,
                usuario=usuario,
                notas=f'Recepción OC #{orden_compra.pk}',
            )

        recepcion = RecepcionMercancia.objects.create(
            orden_compra=orden_compra,
            usuario=usuario,
            confirmada=True,
            justificacion_vencimiento=justificacion_vencimiento,
            **(campos_inspeccion or {}),
        )

        # Update cantidad_recibida on matching OC details and derive new OC state
        for d in detalles:
            detalle_oc = DetalleOrdenCompra.objects.filter(
                orden=orden_compra,
                materia_prima=d['materia_prima'],
                presentacion=d['presentacion'],
            ).first()
            if detalle_oc:
                detalle_oc.cantidad_recibida += d['cantidad_presentacion']
                detalle_oc.save(update_fields=['cantidad_recibida'])

        detalles_oc = list(orden_compra.detalles.all())
        all_received = all(dl.cantidad_recibida >= dl.cantidad_presentacion for dl in detalles_oc)
        any_received = any(dl.cantidad_recibida > 0 for dl in detalles_oc)
        if all_received:
            orden_compra.estado = 'RECIBIDA'
        elif any_received:
            orden_compra.estado = 'PARCIAL'
        orden_compra.save(update_fields=['estado'])

        return recepcion
