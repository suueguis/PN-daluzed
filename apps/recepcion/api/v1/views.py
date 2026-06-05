# apps/recepcion/api/v1/views.py
import io
import os
from datetime import date as date_type

from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from rest_framework import status, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from apps.authentication.permissions import allow_roles

_REC_READ  = ('ADMIN', 'GERENTE', 'INVENTARIO')
_REC_WRITE = ('ADMIN', 'INVENTARIO')

from apps.catalogo.models import MateriaPrima, Presentacion
from apps.recepcion.models import OrdenCompra, RecepcionMercancia, DetalleOrdenCompra
from apps.recepcion.services import RecepcionService, VidaUtilInsuficienteError
from .serializers import (
    RecepcionCreateSerializer,
    RecepcionMercanciaSerializer,
    OrdenCompraSerializer,
)

_WINE    = colors.HexColor('#5C1A1A')
_PEACH   = colors.HexColor('#FDE5CC')
_CREAM   = colors.HexColor('#FDF6EC')
_ROSE    = colors.HexColor('#E55B5B')


def _build_recepcion_pdf(recepcion: RecepcionMercancia) -> bytes:
    oc = recepcion.orden_compra
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style  = ParagraphStyle('title',  fontSize=18, textColor=_WINE, leading=22, alignment=TA_LEFT)
    sub_style    = ParagraphStyle('sub',    fontSize=10, textColor=_WINE, leading=14)
    label_style  = ParagraphStyle('label',  fontSize=8,  textColor=_WINE, leading=12, spaceAfter=1)
    value_style  = ParagraphStyle('value',  fontSize=10, textColor=colors.black, leading=14)
    small_style  = ParagraphStyle('small',  fontSize=7,  textColor=colors.grey, alignment=TA_CENTER)

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    logo_path = os.path.join(settings.BASE_DIR, 'frontend', 'public', 'logo.png')

    header_data = [['', Paragraph('Comprobante de Recepción', title_style)]]
    if os.path.isfile(logo_path):
        from reportlab.platypus import Image
        img = Image(logo_path, width=2.5 * cm, height=2.5 * cm)
        header_data = [[img, Paragraph('Comprobante de Recepción', title_style)]]

    header_table = Table(header_data, colWidths=[3 * cm, None])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',  (1, 0), (1, 0),  'LEFT'),
    ]))
    story.append(header_table)
    story.append(Paragraph('Daluzed — Sistema de Inventario', sub_style))
    story.append(HRFlowable(width='100%', thickness=1, color=_ROSE, spaceAfter=12))

    # ── Info block ────────────────────────────────────────────────────────────
    usuario_email = recepcion.usuario.email if recepcion.usuario else '—'
    proveedor = oc.proveedor.nombre if oc.proveedor else '—'
    estado_oc = dict(OrdenCompra.ESTADO_CHOICES).get(oc.estado, oc.estado)

    info_data = [
        [Paragraph('# Recepción', label_style), Paragraph(f'REC-{recepcion.pk}', value_style),
         Paragraph('Orden de Compra', label_style), Paragraph(f'OC-{oc.pk}', value_style)],
        [Paragraph('Fecha', label_style), Paragraph(str(recepcion.fecha), value_style),
         Paragraph('Proveedor', label_style), Paragraph(proveedor, value_style)],
        [Paragraph('Usuario', label_style), Paragraph(usuario_email, value_style),
         Paragraph('Estado OC', label_style), Paragraph(estado_oc, value_style)],
        [Paragraph('Confirmada', label_style), Paragraph('Sí' if recepcion.confirmada else 'No', value_style),
         '', ''],
    ]
    if recepcion.justificacion_vencimiento:
        info_data.append([
            Paragraph('Justificación vencimiento', label_style),
            Paragraph(recepcion.justificacion_vencimiento, value_style),
            '', '',
        ])

    info_table = Table(info_data, colWidths=[4 * cm, 6 * cm, 4 * cm, None])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), _CREAM),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [_CREAM, colors.white]),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 0.5, _PEACH),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, _PEACH),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.5 * cm))

    # ── Detalles de la OC ─────────────────────────────────────────────────────
    story.append(Paragraph('Detalles de la Orden de Compra', sub_style))
    story.append(Spacer(1, 0.2 * cm))

    detalles_header = [['Materia prima', 'Presentación', 'Cantidad']]
    detalles_rows = [
        [d.materia_prima.nombre, d.presentacion.nombre, str(d.cantidad_presentacion)]
        for d in oc.detalles.select_related('materia_prima', 'presentacion').all()
    ]
    det_data = detalles_header + detalles_rows

    det_table = Table(det_data, colWidths=[8 * cm, 6 * cm, None])
    det_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), _WINE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, _CREAM]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 0.5, _PEACH),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, _PEACH),
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
    ]))
    story.append(det_table)

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 1 * cm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=_PEACH))
    story.append(Paragraph(
        f'Generado el {date_type.today()} · Daluzed Sistema de Inventario',
        small_style,
    ))

    doc.build(story)
    return buf.getvalue()


class OrdenCompraViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = OrdenCompraSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_REC_READ)()]
        return [allow_roles(*_REC_WRITE)()]

    def get_queryset(self):
        qs = (
            OrdenCompra.objects
            .prefetch_related('detalles__materia_prima', 'detalles__presentacion')
            .select_related('proveedor')
            .order_by('-fecha_creacion')
        )
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        oc = OrdenCompra.objects.create(
            proveedor=serializer.validated_data['proveedor'],
            usuario_creador=self.request.user,
        )
        for d in self.request.data.get('detalles', []):
            try:
                mp   = MateriaPrima.objects.get(pk=d['materia_prima_id'])
                pres = Presentacion.objects.get(pk=d['presentacion_id'])
            except (MateriaPrima.DoesNotExist, Presentacion.DoesNotExist, KeyError) as exc:
                raise ValidationError({'detalles': str(exc)})
            DetalleOrdenCompra.objects.create(
                orden=oc,
                materia_prima=mp,
                presentacion=pres,
                cantidad_presentacion=d['cantidad_presentacion'],
            )
        return oc

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        oc = self.perform_create(serializer)
        return Response(
            self.get_serializer(oc).data,
            status=status.HTTP_201_CREATED,
        )


class RecepcionViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    queryset = RecepcionMercancia.objects.all().order_by('-fecha')
    serializer_class = RecepcionMercanciaSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_REC_READ)()]
        return [allow_roles(*_REC_WRITE)()]

    def create(self, request, *args, **kwargs):
        serializer = RecepcionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data
        try:
            recepcion = RecepcionService.registrar_recepcion(
                orden_compra=vd['orden_compra'],
                detalles=vd['detalles'],
                usuario=request.user,
                justificacion_vencimiento=vd.get('justificacion_vencimiento', ''),
            )
        except VidaUtilInsuficienteError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            RecepcionMercanciaSerializer(recepcion).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'], url_path='pdf', permission_classes=[allow_roles(*_REC_READ)])
    def pdf(self, request, pk=None):
        recepcion = get_object_or_404(
            RecepcionMercancia.objects.select_related(
                'orden_compra__proveedor', 'usuario',
            ).prefetch_related('orden_compra__detalles__materia_prima', 'orden_compra__detalles__presentacion'),
            pk=pk,
        )
        pdf_bytes = _build_recepcion_pdf(recepcion)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="REC-{recepcion.pk}.pdf"'
        return response
