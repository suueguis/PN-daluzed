from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import allow_roles

_CAT_READ  = ('ADMIN', 'GERENTE', 'INVENTARIO')
_CAT_WRITE = ('ADMIN', 'INVENTARIO')

from apps.catalogo.models import (
    MateriaPrima,
    Presentacion,
    Proveedor,
    ProductoTerminado,
    UnidadMedida,
)
from apps.catalogo.services import CatalogoService
from apps.catalogo.api.v1.serializers import (
    MateriaPrimaSerializer,
    PresentacionSerializer,
    ProductoTerminadoSerializer,
    ProveedorSerializer,
    UnidadMedidaSerializer,
)


class CatalogoPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ─────────────────────────────────────────────────────────────────────────────
# Unidades de medida
# ─────────────────────────────────────────────────────────────────────────────

class UnidadMedidaViewSet(viewsets.ModelViewSet):
    """CRUD de unidades de medida. Gestionables desde la UI (RF-CAT-02)."""

    serializer_class = UnidadMedidaSerializer
    pagination_class = CatalogoPagination
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_CAT_READ)()]
        return [allow_roles(*_CAT_WRITE)()]

    def get_queryset(self):
        return UnidadMedida.objects.all().order_by('nombre')


# ─────────────────────────────────────────────────────────────────────────────
# Proveedores
# ─────────────────────────────────────────────────────────────────────────────

class ProveedorViewSet(viewsets.ModelViewSet):
    """CRUD de proveedores. Relación M2M con MateriaPrima (RF-CAT-05)."""

    serializer_class = ProveedorSerializer
    pagination_class = CatalogoPagination
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_CAT_READ)()]
        return [allow_roles(*_CAT_WRITE)()]

    def get_queryset(self):
        qs = Proveedor.objects.all().order_by('nombre')
        activo = self.request.query_params.get('activo')
        if activo is not None:
            qs = qs.filter(activo=activo.lower() == 'true')
        return qs


# ─────────────────────────────────────────────────────────────────────────────
# Materias primas
# ─────────────────────────────────────────────────────────────────────────────

class MateriaPrimaViewSet(viewsets.ModelViewSet):
    """
    CRUD de materias primas.
    Acciones adicionales: desactivar (soft-delete) y proveedores (M2M).
    """

    serializer_class = MateriaPrimaSerializer
    pagination_class = CatalogoPagination
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_CAT_READ)()]
        return [allow_roles(*_CAT_WRITE)()]

    def get_queryset(self):
        qs = MateriaPrima.objects.select_related('unidad_medida').prefetch_related(
            'proveedores', 'presentaciones'
        )
        if self.action == 'list':
            return qs.filter(activo=True)
        return qs

    @action(detail=True, methods=['post'], url_path='desactivar')
    def desactivar(self, request, pk=None):
        """Soft-delete. Rechaza con 400 si tiene lotes con stock activo (RF-CAT-01)."""
        mp = self.get_object()
        try:
            CatalogoService.desactivar_materia_prima(mp)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(mp).data)

    @action(detail=True, methods=['post'], url_path='proveedores')
    def agregar_proveedor(self, request, pk=None):
        """Asocia un proveedor existente a esta materia prima (M2M, RF-CAT-06)."""
        mp = self.get_object()
        proveedor_id = request.data.get('proveedor_id')
        try:
            proveedor = Proveedor.objects.get(pk=proveedor_id)
        except Proveedor.DoesNotExist:
            return Response(
                {'detail': f'Proveedor {proveedor_id} no encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        CatalogoService.asociar_proveedor(mp, proveedor)
        return Response(self.get_serializer(mp).data)


# ─────────────────────────────────────────────────────────────────────────────
# Productos terminados
# ─────────────────────────────────────────────────────────────────────────────

class ProductoTerminadoViewSet(viewsets.ModelViewSet):
    """CRUD de productos terminados con vida útil configurable (RF-CAT-04, RF-CAT-09)."""

    serializer_class = ProductoTerminadoSerializer
    pagination_class = CatalogoPagination
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [allow_roles(*_CAT_READ)()]
        return [allow_roles(*_CAT_WRITE)()]

    def get_queryset(self):
        return ProductoTerminado.objects.select_related('unidad_medida').all()


# ─────────────────────────────────────────────────────────────────────────────
# Presentaciones
# ─────────────────────────────────────────────────────────────────────────────

class PresentacionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PresentacionSerializer
    pagination_class = CatalogoPagination
    permission_classes = [allow_roles(*_CAT_READ)]

    def get_queryset(self):
        qs = Presentacion.objects.select_related('materia_prima', 'unidad_medida').order_by('nombre')
        mp_id = self.request.query_params.get('materia_prima')
        if mp_id:
            qs = qs.filter(materia_prima_id=mp_id)
        return qs


# ─────────────────────────────────────────────────────────────────────────────
# Importación masiva
# ─────────────────────────────────────────────────────────────────────────────

class PlantillaView(APIView):
    """
    GET /catalogo/plantilla/?tipo=materias_primas|productos_terminados|proveedores
    Devuelve un archivo .xlsx con las columnas esperadas y una fila de ejemplo.
    """

    permission_classes = [allow_roles(*_CAT_READ)]

    TEMPLATES = {
        'materias_primas': {
            'filename': 'plantilla_materias_primas.xlsx',
            'headers': ['nombre', 'simbolo_unidad', 'categoria', 'punto_reorden',
                        'dias_minimos_vencimiento', 'condicion_almacenamiento'],
            'example': ['Harina de trigo', 'g', 'GALLETERIA', 5000, 30, 'AMBIENTE'],
        },
        'productos_terminados': {
            'filename': 'plantilla_productos_terminados.xlsx',
            'headers': ['nombre', 'simbolo_unidad', 'vida_util_dias'],
            'example': ['Torta de vainilla', 'und', 14],
        },
        'proveedores': {
            'filename': 'plantilla_proveedores.xlsx',
            'headers': ['nombre', 'contacto', 'telefono', 'email'],
            'example': ['Harinas del Sur', 'Ana López', '3001234567', 'ana@hsdelsur.co'],
        },
    }

    def get(self, request):
        import io
        import openpyxl
        from openpyxl.styles import Font
        from django.http import HttpResponse

        tipo = request.query_params.get('tipo', 'materias_primas')
        if tipo not in self.TEMPLATES:
            return Response(
                {'detail': f'tipo debe ser uno de: {", ".join(self.TEMPLATES)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tpl = self.TEMPLATES[tipo]
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = tipo

        ws.append(tpl['headers'])
        for cell in ws[1]:
            cell.font = Font(bold=True)
        ws.append(tpl['example'])

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response = HttpResponse(buf.read(), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{tpl["filename"]}"'
        return response


class ImportarCatalogoView(APIView):
    """
    Importación masiva desde Excel (.xlsx) o CSV.
    Campo 'file': archivo. Campo 'tipo': materias_primas | productos_terminados | proveedores.
    Retorna procesados, creados y lista de errores por fila (RF-CAT-07).
    """

    permission_classes = [allow_roles(*_CAT_WRITE)]
    parser_classes = [MultiPartParser]

    TIPOS_VALIDOS = ('materias_primas', 'productos_terminados', 'proveedores')

    def post(self, request):
        archivo = request.FILES.get('file')
        tipo = request.data.get('tipo', '')

        if not archivo:
            return Response(
                {'detail': 'Se requiere un archivo en el campo "file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if tipo not in self.TIPOS_VALIDOS:
            return Response(
                {'detail': f'"tipo" debe ser uno de: {", ".join(self.TIPOS_VALIDOS)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resultado = CatalogoService.importar_desde_archivo(archivo, tipo)
        return Response(resultado)
