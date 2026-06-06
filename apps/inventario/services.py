# apps/inventario/services.py
from datetime import date
from django.db import transaction
from django.db.models import Sum

from apps.catalogo.models import MateriaPrima
from .models import Bodega, Lote, MovimientoInventario


class InventarioService:

    @staticmethod
    def consultar_stock(materia_prima_id, bodega_id):
        cantidad = (
            Lote.objects
            .filter(materia_prima_id=materia_prima_id, bodega_id=bodega_id)
            .aggregate(total=Sum('cantidad'))['total']
        ) or 0
        return {'cantidad_total': cantidad}

    @staticmethod
    def consultar_reorden(materia_prima_id):
        mp = MateriaPrima.objects.get(pk=materia_prima_id)
        bp = Bodega.objects.filter(tipo='PRINCIPAL').first()
        stock_bp = (
            Lote.objects
            .filter(materia_prima_id=materia_prima_id, bodega=bp)
            .aggregate(total=Sum('cantidad'))['total']
        ) or 0
        return {
            'materia_prima': materia_prima_id,
            'stock_bodega_principal': stock_bp,
            'punto_reorden': mp.punto_reorden,
            'por_debajo_reorden': stock_bp <= mp.punto_reorden,
        }

    @staticmethod
    def sugerir_fefo(materia_prima_id, bodega_id, excluir_vencidos=False):
        qs = Lote.objects.filter(
            materia_prima_id=materia_prima_id,
            bodega_id=bodega_id,
            cantidad__gt=0,
        ).order_by('fecha_vencimiento')
        if excluir_vencidos:
            qs = qs.filter(fecha_vencimiento__gte=date.today())
        lotes = list(qs)
        return {
            'lote_sugerido': lotes[0] if lotes else None,
            'lotes': lotes,
        }

    @staticmethod
    @transaction.atomic
    def registrar_traslado(lote, bodega_destino, cantidad, usuario):
        if lote.cantidad < cantidad:
            raise ValueError("Stock insuficiente en el lote de origen.")
        bodega_origen = lote.bodega
        lote.cantidad -= cantidad
        lote.save()
        Lote.objects.create(
            materia_prima=lote.materia_prima,
            bodega=bodega_destino,
            cantidad=cantidad,
            fecha_vencimiento=lote.fecha_vencimiento,
            fecha_entrada=date.today(),
        )
        return MovimientoInventario.objects.create(
            tipo='TRASLADO',
            lote=lote,
            bodega_origen=bodega_origen,
            bodega_destino=bodega_destino,
            cantidad=cantidad,
            usuario=usuario,
        )

    @staticmethod
    def registrar_devolucion(lote, proveedor, motivo, usuario):
        cantidad_original = lote.cantidad
        lote.cantidad = 0
        lote.save()
        return MovimientoInventario.objects.create(
            tipo='DEVOLUCION',
            lote=lote,
            bodega_origen=lote.bodega,
            cantidad=cantidad_original,
            usuario=usuario,
            notas=motivo,
        )

    @staticmethod
    def registrar_descarte(lote, motivo, usuario):
        cantidad_original = lote.cantidad
        lote.cantidad = 0
        lote.save()
        return MovimientoInventario.objects.create(
            tipo='DESCARTE',
            lote=lote,
            bodega_origen=lote.bodega,
            cantidad=cantidad_original,
            usuario=usuario,
            notas=motivo,
        )

    @staticmethod
    def consultar_stock_pdp_comprometido() -> list[dict]:
        from django.db.models import Sum, Value
        from django.db.models.functions import Coalesce
        from apps.produccion.models import DetalleBatido

        pdp_ids = list(Bodega.objects.filter(tipo='PDP').values_list('id', flat=True))
        stock_rows = (
            Lote.objects
            .filter(bodega_id__in=pdp_ids, cantidad__gt=0)
            .values('materia_prima_id', 'materia_prima__nombre')
            .annotate(stock_pdp=Sum('cantidad'))
        )
        comprometido_map = {
            r['materia_prima_id']: r['comprometido']
            for r in (
                DetalleBatido.objects
                .filter(batido__estado='EN_PROCESO')
                .values('materia_prima_id')
                .annotate(comprometido=Sum('cantidad'))
            )
        }
        result = []
        for row in stock_rows:
            mp_id = row['materia_prima_id']
            stock = row['stock_pdp']
            comprometido = comprometido_map.get(mp_id, 0)
            result.append({
                'materia_prima_id': mp_id,
                'materia_prima_nombre': row['materia_prima__nombre'],
                'stock_pdp': stock,
                'comprometido': comprometido,
                'disponible': max(0, stock - comprometido),
            })
        return result


_KARDEX_ENTRADAS = frozenset({'RECEPCION'})
_KARDEX_SALIDAS  = frozenset({'CONSUMO', 'DEVOLUCION', 'DESCARTE'})


def calcular_kardex(
    materia_prima_id: int,
    desde: str | None = None,
    hasta: str | None = None,
    tipo: str | None = None,
) -> list[MovimientoInventario]:
    qs = (
        MovimientoInventario.objects
        .filter(lote__materia_prima_id=materia_prima_id)
        .select_related('lote', 'bodega_origen', 'bodega_destino', 'usuario')
        .order_by('fecha')
    )
    if desde:
        qs = qs.filter(fecha__date__gte=desde)
    if hasta:
        qs = qs.filter(fecha__date__lte=hasta)

    saldo = 0
    rows: list[MovimientoInventario] = []
    for mov in qs:
        if mov.tipo in _KARDEX_ENTRADAS:
            saldo += mov.cantidad
        elif mov.tipo in _KARDEX_SALIDAS:
            saldo -= mov.cantidad
        mov.saldo = saldo
        if tipo and mov.tipo != tipo:
            continue
        rows.append(mov)

    return rows
