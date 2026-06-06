from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date, timedelta

from apps.catalogo.models import UnidadMedida, MateriaPrima, ProductoTerminado
from apps.inventario.models import Bodega, Lote
from apps.produccion.models import Batido, LoteProductoTerminado

from apps.recepcion.models import OrdenCompra, RecepcionMercancia
from apps.catalogo.models import Proveedor

User = get_user_model()

URL_KPI            = '/api/v1/indicadores/kpis/'
URL_EXPORTAR       = '/api/v1/indicadores/exportar/'
URL_REPORTE_SEMANAL = '/api/v1/indicadores/reporte-semanal/'
URL_RESUMEN        = '/api/v1/indicadores/resumen/'


class IndicadoresTestCase(APITestCase):
    """IND-001 al IND-005: KPIs del dashboard y exportación de reportes."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='gerente@daluzed.com',
            password='Daluzed2026!',
            role='GERENTE',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        self.gramos   = UnidadMedida.objects.create(nombre='Gramos',   simbolo='g')
        self.unidades = UnidadMedida.objects.create(nombre='Unidades', simbolo='und')
        self.mp = MateriaPrima.objects.create(
            nombre='Harina', unidad_medida=self.gramos, punto_reorden=5000
        )
        self.pt = ProductoTerminado.objects.create(
            nombre='Torta de vainilla', vida_util_dias=14, unidad_medida=self.unidades
        )
        self.bodega_principal = Bodega.objects.create(
            nombre='Bodega Principal', tipo='PRINCIPAL'
        )
        hoy = date.today()
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=30000,
            fecha_vencimiento=hoy + timedelta(days=60),
            fecha_entrada=hoy,
        )
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=5000,
            fecha_vencimiento=hoy + timedelta(days=4),  # vence pronto
            fecha_entrada=hoy - timedelta(days=30),
        )

    # ── IND-001 ───────────────────────────────────────────────────────
    def test_ind_001_kpi_stock_actual_por_bodega(self):
        """
        GET /indicadores/kpis/?tipo=stock devuelve el stock total
        de cada materia prima desglosado por bodega.
        RF-IND-01
        """
        response = self.client.get(URL_KPI, {'tipo': 'stock'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('stock_por_bodega', response.data)
        total_bp = sum(
            float(item['cantidad_total'])
            for item in response.data['stock_por_bodega']
            if item['bodega_tipo'] == 'PRINCIPAL'
        )
        self.assertAlmostEqual(total_bp, 35000.0)

    # ── IND-002 ───────────────────────────────────────────────────────
    def test_ind_002_kpi_lotes_proximos_a_vencer(self):
        """
        GET /indicadores/kpis/?tipo=vencimientos devuelve los lotes
        que vencen en los próximos 7 días.
        RF-IND-01
        """
        response = self.client.get(URL_KPI, {'tipo': 'vencimientos', 'dias': 7})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('lotes_por_vencer', response.data)
        ids_proximos = [lote['lote_id'] for lote in response.data['lotes_por_vencer']]
        lote_proximo = Lote.objects.filter(
            fecha_vencimiento=date.today() + timedelta(days=4)
        ).first()
        self.assertIn(lote_proximo.id, ids_proximos)

    # ── IND-003 ───────────────────────────────────────────────────────
    def test_ind_003_kpi_unidades_producidas_en_periodo(self):
        """
        GET /indicadores/kpis/?tipo=produccion&desde=X&hasta=Y
        devuelve el total de unidades producidas en el rango de fechas.
        RF-IND-01
        """
        user_prod = User.objects.create_user(
            email='prod2@daluzed.com', password='Pass123!', role='PRODUCCION'
        )
        hoy = date.today()
        for i in range(3):
            batido = Batido.objects.create(
                producto_terminado=self.pt,
                fecha_produccion=hoy - timedelta(days=i),
                hora_inicio='08:00',
                estado='COMPLETADO',
                usuario=user_prod,
            )
            LoteProductoTerminado.objects.create(
                batido=batido,
                estado='EN_ESPERA',
                fecha_vencimiento=hoy + timedelta(days=14),
                fecha_produccion=hoy - timedelta(days=i),
                cantidad=20,
            )
        response = self.client.get(
            URL_KPI,
            {
                'tipo': 'produccion',
                'desde': str(hoy - timedelta(days=7)),
                'hasta': str(hoy),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['total_unidades_producidas'], 60)

    # ── IND-004 ───────────────────────────────────────────────────────
    def test_ind_004_exportar_reporte_inventario_pdf(self):
        """
        GET /indicadores/exportar/?formato=pdf devuelve un archivo PDF
        con Content-Type: application/pdf.
        RF-IND-02
        """
        response = self.client.get(URL_EXPORTAR, {'formato': 'pdf'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('Content-Disposition', response)
        self.assertIn('attachment', response['Content-Disposition'])

    # ── IND-005 ───────────────────────────────────────────────────────
    def test_ind_005_exportar_reporte_inventario_excel(self):
        """
        GET /indicadores/exportar/?formato=xlsx devuelve un archivo Excel
        con Content-Type correspondiente a hoja de cálculo OOXML.
        RF-IND-02
        """
        response = self.client.get(URL_EXPORTAR, {'formato': 'xlsx'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('spreadsheetml', response['Content-Type'])
        self.assertIn('Content-Disposition', response)
        self.assertIn('.xlsx', response['Content-Disposition'])

    # ── IND-009 ───────────────────────────────────────────────────────
    def test_ind_009_resumen_dashboard(self):
        """
        GET /indicadores/resumen/ devuelve los campos del resumen consolidado:
        stock_bp_total, rotacion_inventario, periodo_rotacion, batidos_semana,
        lotes_por_vencer_count y oc_pendientes.
        RF-IND-01, RF-IND-07
        """
        response = self.client.get(URL_RESUMEN)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for campo in (
            'stock_bp_total', 'rotacion_inventario', 'periodo_rotacion',
            'batidos_semana', 'lotes_por_vencer_count', 'oc_pendientes',
        ):
            self.assertIn(campo, response.data)

        # stock BP: 30000 + 5000 = 35000 (creados en setUp)
        self.assertAlmostEqual(float(response.data['stock_bp_total']), 35000.0)

        # batidos_semana debe tener 7 entradas con campos día/fecha/batidos
        semana = response.data['batidos_semana']
        self.assertEqual(len(semana), 7)
        self.assertIn('dia', semana[0])
        self.assertIn('fecha', semana[0])
        self.assertIn('batidos', semana[0])

        # lotes por vencer en 7 días: hay 1 en setUp (fecha_vencimiento = hoy+4)
        self.assertEqual(response.data['lotes_por_vencer_count'], 1)

        # oc_pendientes: no hay OC en este setUp, debe ser 0
        self.assertEqual(response.data['oc_pendientes'], 0)


class ReporteSemanalTestCase(APITestCase):
    """IND-006 al IND-008: Reporte histórico semanal de operaciones."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='gerente2@daluzed.com',
            password='Daluzed2026!',
            role='GERENTE',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')

        gramos = UnidadMedida.objects.create(nombre='GramosR', simbolo='gr')
        unidades = UnidadMedida.objects.create(nombre='UnidadesR', simbolo='uR')
        mp = MateriaPrima.objects.create(nombre='Azúcar', unidad_medida=gramos, punto_reorden=1000)
        pt = ProductoTerminado.objects.create(
            nombre='Torta de chocolate', vida_util_dias=7, unidad_medida=unidades
        )
        proveedor = Proveedor.objects.create(nombre='Dist. Central', activo=True)
        bodega = Bodega.objects.create(nombre='Bodega Rep', tipo='PRINCIPAL')

        hoy = date.today()
        lunes_pasado = hoy - timedelta(days=hoy.weekday() + 7)

        # Batido en la semana pasada
        batido = Batido.objects.create(
            producto_terminado=pt,
            fecha_produccion=lunes_pasado + timedelta(days=1),
            hora_inicio='08:00',
            estado='COMPLETADO',
            usuario=self.user,
        )
        lote_pt = LoteProductoTerminado.objects.create(
            batido=batido,
            estado='EN_PUNTO_DE_VENTA',
            cantidad=50,
            fecha_produccion=lunes_pasado + timedelta(days=1),
            fecha_vencimiento=lunes_pasado + timedelta(days=8),
            fecha_despacho=lunes_pasado + timedelta(days=2),
        )

        # Recepción en la semana pasada
        oc = OrdenCompra.objects.create(proveedor=proveedor, estado='RECIBIDA', usuario_creador=self.user)
        RecepcionMercancia.objects.create(
            orden_compra=oc,
            fecha=lunes_pasado + timedelta(days=1),
            usuario=self.user,
        )

        self.desde = str(lunes_pasado)
        self.hasta = str(lunes_pasado + timedelta(days=6))

    # ── IND-006 ───────────────────────────────────────────────────────
    def test_ind_006_reporte_semanal_estructura(self):
        """
        GET /indicadores/reporte-semanal/?desde=&hasta= devuelve
        estructura con clave 'semanas' y campos por semana.
        RF-IND-06
        """
        response = self.client.get(URL_REPORTE_SEMANAL, {'desde': self.desde, 'hasta': self.hasta})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('semanas', response.data)
        self.assertIn('desde', response.data)
        self.assertIn('hasta', response.data)
        semanas = response.data['semanas']
        self.assertGreater(len(semanas), 0)
        primera = semanas[0]
        for campo in ('semana_inicio', 'batidos', 'recepciones', 'despachos', 'unidades_despachadas'):
            self.assertIn(campo, primera)

    # ── IND-007 ───────────────────────────────────────────────────────
    def test_ind_007_reporte_semanal_conteos_correctos(self):
        """
        Los conteos de batidos, recepciones y despachos reflejan
        los registros creados en setUp dentro del rango de fechas.
        RF-IND-06
        """
        response = self.client.get(URL_REPORTE_SEMANAL, {'desde': self.desde, 'hasta': self.hasta})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        semanas = response.data['semanas']
        total_batidos = sum(s['batidos'] for s in semanas)
        total_recepciones = sum(s['recepciones'] for s in semanas)
        total_despachos = sum(s['despachos'] for s in semanas)
        self.assertGreaterEqual(total_batidos, 1)
        self.assertGreaterEqual(total_recepciones, 1)
        self.assertGreaterEqual(total_despachos, 1)

    # ── IND-008 ───────────────────────────────────────────────────────
    def test_ind_008_reporte_semanal_exportar_excel(self):
        """
        GET /indicadores/reporte-semanal/?formato=xlsx devuelve
        archivo Excel con Content-Type spreadsheetml.
        RF-IND-06
        """
        response = self.client.get(
            URL_REPORTE_SEMANAL,
            {'desde': self.desde, 'hasta': self.hasta, 'formato': 'xlsx'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('spreadsheetml', response['Content-Type'])
        self.assertIn('attachment', response['Content-Disposition'])
        self.assertIn('.xlsx', response['Content-Disposition'])
