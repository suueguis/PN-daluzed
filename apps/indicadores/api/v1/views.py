import io
from datetime import date, timedelta

from django.db.models import Sum
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventario.models import Lote
from apps.produccion.models import LoteProductoTerminado


class KpisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tipo = request.query_params.get('tipo', 'stock')

        if tipo == 'stock':
            return self._stock()
        if tipo == 'vencimientos':
            dias = int(request.query_params.get('dias', 7))
            return self._vencimientos(dias)
        if tipo == 'produccion':
            desde = request.query_params.get('desde')
            hasta = request.query_params.get('hasta')
            return self._produccion(desde, hasta)
        return Response({'detail': 'tipo inválido. Use: stock, vencimientos, produccion'}, status=400)

    def _stock(self):
        rows = (
            Lote.objects.values(
                'bodega__nombre',
                'bodega__tipo',
                'materia_prima__nombre',
                'materia_prima__unidad_medida__simbolo',
            )
            .annotate(cantidad_total=Sum('cantidad'))
            .order_by('bodega__nombre', '-cantidad_total')
        )
        stock_por_bodega = [
            {
                'bodega_nombre':  r['bodega__nombre'],
                'bodega_tipo':    r['bodega__tipo'],
                'materia_prima':  r['materia_prima__nombre'],
                'unidad':         r['materia_prima__unidad_medida__simbolo'],
                'cantidad_total': str(r['cantidad_total']),
            }
            for r in rows
        ]
        return Response({'stock_por_bodega': stock_por_bodega})

    def _vencimientos(self, dias):
        hoy = date.today()
        limite = hoy + timedelta(days=dias)
        lotes = (
            Lote.objects
            .filter(fecha_vencimiento__range=(hoy, limite))
            .select_related('materia_prima', 'bodega')
            .order_by('fecha_vencimiento')
        )
        lotes_por_vencer = [
            {
                'lote_id':           lote.id,
                'numero_lote':       lote.numero_lote,
                'materia_prima':     lote.materia_prima.nombre,
                'bodega':            lote.bodega.nombre,
                'cantidad':          str(lote.cantidad),
                'fecha_vencimiento': str(lote.fecha_vencimiento),
                'dias_restantes':    (lote.fecha_vencimiento - hoy).days,
            }
            for lote in lotes
        ]
        return Response({'lotes_por_vencer': lotes_por_vencer})

    def _produccion(self, desde, hasta):
        qs = LoteProductoTerminado.objects.all()
        if desde:
            qs = qs.filter(fecha_produccion__gte=desde)
        if hasta:
            qs = qs.filter(fecha_produccion__lte=hasta)
        total = qs.aggregate(total=Sum('cantidad'))['total'] or 0
        return Response({'total_unidades_producidas': total})


class ExportarView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        formato = request.query_params.get('formato', 'xlsx')
        if formato == 'pdf':
            return self._exportar_pdf()
        if formato == 'xlsx':
            return self._exportar_excel()
        return Response({'detail': 'formato inválido. Use: pdf, xlsx'}, status=400)

    def _stock_data(self):
        return (
            Lote.objects.values(
                'bodega__nombre',
                'bodega__tipo',
                'materia_prima__nombre',
                'materia_prima__unidad_medida__simbolo',
            )
            .annotate(cantidad_total=Sum('cantidad'))
            .order_by('bodega__nombre', '-cantidad_total')
        )

    def _exportar_excel(self):
        import openpyxl
        from openpyxl.styles import Font

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Stock Inventario'

        headers = ['Bodega', 'Tipo', 'Materia Prima', 'Unidad', 'Cantidad Total']
        ws.append(headers)
        for cell in ws[1]:
            cell.font = Font(bold=True)

        for row in self._stock_data():
            ws.append([
                row['bodega__nombre'],
                row['bodega__tipo'],
                row['materia_prima__nombre'],
                row['materia_prima__unidad_medida__simbolo'],
                float(row['cantidad_total']),
            ])

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = f'inventario_{date.today()}.xlsx'
        response = HttpResponse(buf.read(), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    def _exportar_pdf(self):
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm)
        styles = getSampleStyleSheet()
        elements = []

        elements.append(Paragraph('Reporte de Inventario — Daluzed', styles['Heading1']))
        elements.append(Paragraph(f'Generado: {date.today()}', styles['Normal']))
        elements.append(Spacer(1, 0.5*cm))

        rows = [['Bodega', 'Tipo', 'Materia Prima', 'Unidad', 'Cantidad']]
        for row in self._stock_data():
            rows.append([
                row['bodega__nombre'],
                row['bodega__tipo'],
                row['materia_prima__nombre'],
                row['materia_prima__unidad_medida__simbolo'] or '',
                str(row['cantidad_total']),
            ])

        t = Table(rows, hAlign='LEFT')
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8B1A1A')),
            ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
            ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',   (0, 0), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FFF5EE')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDBBAA')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(t)

        doc.build(elements)
        buf.seek(0)

        filename = f'inventario_{date.today()}.pdf'
        response = HttpResponse(buf.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class UtilizacionBodegaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.inventario.models import ZonaBodega
        from django.db.models import Sum, F, Value
        from django.db.models.functions import Coalesce

        zonas = (
            ZonaBodega.objects
            .select_related('bodega')
            .annotate(
                stock_actual=Coalesce(Sum('lotes__cantidad'), Value(0))
            )
            .values(
                'id',
                'nombre',
                'bodega__nombre',
                'bodega__tipo',
                'capacidad_maxima',
                'stock_actual',
            )
        )

        data = []
        for zona in zonas:
            capacidad = float(zona['capacidad_maxima']) or 1
            stock = float(zona['stock_actual']) or 0
            porcentaje = min(100, (stock / capacidad * 100)) if capacidad > 0 else 0

            data.append({
                'zona_id': zona['id'],
                'zona_nombre': zona['nombre'],
                'bodega_nombre': zona['bodega__nombre'],
                'bodega_tipo': zona['bodega__tipo'],
                'stock_actual': str(stock),
                'capacidad_maxima': str(zona['capacidad_maxima']),
                'porcentaje_utilizacion': round(porcentaje, 1),
            })

        return Response({
            'utilizacion_por_zona': sorted(data, key=lambda x: x['bodega_nombre'])
        })
