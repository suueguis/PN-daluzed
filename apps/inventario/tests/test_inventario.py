# apps/inventario/tests/test_inventario.py

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date, timedelta

from apps.catalogo.models import UnidadMedida, MateriaPrima
from apps.inventario.models import Bodega, Lote, MovimientoInventario

User = get_user_model()


class ConsultaStockTestCase(APITestCase):
    """INV-001 al INV-006: Consulta de stock y lógica FEFO."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        # Materias primas y bodegas
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.mp_harina = MateriaPrima.objects.create(
            nombre='Harina de trigo',
            unidad_medida=self.gramos,
            punto_reorden=10000,
        )
        self.bodega_principal = Bodega.objects.create(
            nombre='Bodega Principal', tipo='PRINCIPAL'
        )
        self.bodega_pdp = Bodega.objects.create(
            nombre='Bodega PDP', tipo='PDP'
        )
        hoy = date.today()
        # Lote en Bodega Principal
        self.lote_bp = Lote.objects.create(
            materia_prima=self.mp_harina,
            bodega=self.bodega_principal,
            cantidad=50000,
            fecha_vencimiento=hoy + timedelta(days=60),
            fecha_entrada=hoy,
        )
        # Lote en Bodega PDP
        self.lote_pdp = Lote.objects.create(
            materia_prima=self.mp_harina,
            bodega=self.bodega_pdp,
            cantidad=5000,
            fecha_vencimiento=hoy + timedelta(days=45),
            fecha_entrada=hoy - timedelta(days=5),
        )

    # ── INV-001 ───────────────────────────────────────────────────────
    def test_inv_001_consultar_stock_bodega_principal(self):
        """
        GET /inventario/stock/?materia_prima=X&bodega=Y
        devuelve la cantidad correcta para Bodega Principal.
        RF-INV-01
        """
        # Act
        response = self.client.get(
            '/api/v1/inventario/stock/',
            {
                'materia_prima': self.mp_harina.id,
                'bodega': self.bodega_principal.id,
            },
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['cantidad_total']), 50000.0)

    # ── INV-002 ───────────────────────────────────────────────────────
    def test_inv_002_consultar_stock_bodega_pdp(self):
        """
        Stock de Bodega PDP se consulta correctamente de forma independiente.
        RF-INV-01
        """
        # Act
        response = self.client.get(
            '/api/v1/inventario/stock/',
            {
                'materia_prima': self.mp_harina.id,
                'bodega': self.bodega_pdp.id,
            },
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['cantidad_total']), 5000.0)

    # ── INV-003 ───────────────────────────────────────────────────────
    def test_inv_003_bodega_pdp_excluida_del_calculo_reorden(self):
        """
        El punto de reorden se calcula SOLO con Bodega Principal.
        El stock de PDP no suma al cálculo.
        RF-INV-02
        """
        # Arrange — reducir stock BP por debajo del punto de reorden
        self.lote_bp.cantidad = 8000  # punto_reorden = 10000
        self.lote_bp.save()
        # Act
        response = self.client.get(
            '/api/v1/inventario/reorden/',
            {'materia_prima': self.mp_harina.id},
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Solo el stock de BP debe aparecer en el cálculo
        self.assertEqual(float(response.data['stock_bodega_principal']), 8000.0)
        self.assertTrue(response.data['por_debajo_reorden'])
        # El stock de PDP no debe sumarse al cálculo de reorden
        self.assertNotIn('stock_pdp', response.data.get('stock_calculo', {}))

    # ── INV-004 ───────────────────────────────────────────────────────
    def test_inv_004_stock_por_debajo_reorden_genera_senal(self):
        """
        Cuando el stock de BP toca el punto de reorden, la respuesta
        indica por_debajo_reorden=True.
        RF-INV-02
        """
        # Arrange — stock exactamente en el punto de reorden (10000)
        self.lote_bp.cantidad = 10000
        self.lote_bp.save()
        # Act
        response = self.client.get(
            '/api/v1/inventario/reorden/',
            {'materia_prima': self.mp_harina.id},
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['por_debajo_reorden'])

    # ── INV-005 ───────────────────────────────────────────────────────
    def test_inv_005_sugerencia_fefo_devuelve_lote_con_vencimiento_mas_proximo(self):
        """
        El endpoint FEFO devuelve el lote con la fecha de vencimiento
        más próxima de la Bodega PDP.
        RF-INV-03
        """
        # Arrange — añadir lote con vencimiento más cercano
        hoy = date.today()
        lote_proximo = Lote.objects.create(
            materia_prima=self.mp_harina,
            bodega=self.bodega_pdp,
            cantidad=2000,
            fecha_vencimiento=hoy + timedelta(days=10),  # vence más pronto
            fecha_entrada=hoy,
        )
        # Act
        response = self.client.get(
            '/api/v1/inventario/fefo/',
            {
                'materia_prima': self.mp_harina.id,
                'bodega': self.bodega_pdp.id,
            },
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['lote_sugerido']['id'], lote_proximo.id)

    # ── INV-006 ───────────────────────────────────────────────────────
    def test_inv_006_fefo_ignora_lotes_vencidos(self):
        """
        La sugerencia FEFO no devuelve lotes con fecha_vencimiento < hoy.
        RF-INV-03
        """
        # Arrange — lote ya vencido en PDP
        hoy = date.today()
        Lote.objects.create(
            materia_prima=self.mp_harina,
            bodega=self.bodega_pdp,
            cantidad=3000,
            fecha_vencimiento=hoy - timedelta(days=1),  # ya venció
            fecha_entrada=hoy - timedelta(days=30),
        )
        # Act
        response = self.client.get(
            '/api/v1/inventario/fefo/',
            {
                'materia_prima': self.mp_harina.id,
                'bodega': self.bodega_pdp.id,
                'excluir_vencidos': True,
            },
        )
        # Assert — el lote vencido no debe estar en la lista
        lote_ids = [l['id'] for l in response.data.get('lotes', [])]
        lotes_vencidos_ids = list(
            Lote.objects.filter(
                bodega=self.bodega_pdp,
                fecha_vencimiento__lt=hoy,
            ).values_list('id', flat=True)
        )
        for vid in lotes_vencidos_ids:
            self.assertNotIn(vid, lote_ids)


class TrasladoInventarioTestCase(APITestCase):
    """INV-007 al INV-012: Traslados, devoluciones y trazabilidad."""

    URL_TRASLADO = '/api/v1/inventario/traslados/'

    def setUp(self):
        self.user = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.mp = MateriaPrima.objects.create(
            nombre='Azúcar blanca',
            unidad_medida=self.gramos,
            punto_reorden=5000,
        )
        self.bodega_principal = Bodega.objects.create(
            nombre='Bodega Principal', tipo='PRINCIPAL'
        )
        self.bodega_pdp = Bodega.objects.create(
            nombre='Bodega PDP', tipo='PDP'
        )
        hoy = date.today()
        self.lote = Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=20000,
            fecha_vencimiento=hoy + timedelta(days=90),
            fecha_entrada=hoy,
        )

    # ── INV-007 ───────────────────────────────────────────────────────
    def test_inv_007_traslado_descuenta_bp_e_incrementa_pdp_atomicamente(self):
        """
        Registrar un traslado descuenta la cantidad de BP e
        incrementa la misma cantidad en PDP. Operación atómica.
        RF-INV-04
        """
        # Arrange
        payload = {
            'lote_id': self.lote.id,
            'bodega_destino': self.bodega_pdp.id,
            'cantidad': 5000,
        }
        cantidad_inicial_bp = self.lote.cantidad
        # Act
        response = self.client.post(self.URL_TRASLADO, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.lote.refresh_from_db()
        self.assertEqual(float(self.lote.cantidad), float(cantidad_inicial_bp) - 5000)
        # Verificar que existe un lote nuevo en PDP con la cantidad trasladada
        lote_pdp = Lote.objects.filter(
            materia_prima=self.mp,
            bodega=self.bodega_pdp,
            cantidad=5000,
        ).first()
        self.assertIsNotNone(lote_pdp)

    # ── INV-008 ───────────────────────────────────────────────────────
    def test_inv_008_traslado_con_stock_insuficiente_devuelve_error(self):
        """
        Intentar trasladar más cantidad de la disponible en BP → HTTP 400.
        RF-INV-04
        """
        # Arrange
        payload = {
            'lote_id': self.lote.id,
            'bodega_destino': self.bodega_pdp.id,
            'cantidad': 99999,  # más que los 20000 disponibles
        }
        # Act
        response = self.client.post(self.URL_TRASLADO, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # El lote no debe haber cambiado
        self.lote.refresh_from_db()
        self.assertEqual(float(self.lote.cantidad), 20000.0)

    # ── INV-009 ───────────────────────────────────────────────────────
    def test_inv_009_traslado_es_inmutable(self):
        """
        Un traslado confirmado no puede modificarse ni eliminarse.
        RF-INV-04 (inmutabilidad de movimientos)
        """
        # Arrange — crear un traslado
        payload = {
            'lote_id': self.lote.id,
            'bodega_destino': self.bodega_pdp.id,
            'cantidad': 3000,
        }
        create_response = self.client.post(self.URL_TRASLADO, payload, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        traslado_id = create_response.data['id']
        # Act — intentar modificar
        patch_response = self.client.patch(
            f'{self.URL_TRASLADO}{traslado_id}/',
            {'cantidad': 9999},
            format='json',
        )
        delete_response = self.client.delete(
            f'{self.URL_TRASLADO}{traslado_id}/'
        )
        # Assert — ambas operaciones deben estar prohibidas
        self.assertIn(
            patch_response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED],
        )
        self.assertIn(
            delete_response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED],
        )

    # ── INV-010 ───────────────────────────────────────────────────────
    def test_inv_010_registrar_devolucion_lote_vencido_a_proveedor(self):
        """
        POST /inventario/devoluciones/ registra la devolución de un
        lote vencido al proveedor. El movimiento queda en bitácora.
        RF-INV-05
        """
        # Arrange — lote ya vencido
        from apps.catalogo.models import Proveedor
        proveedor = Proveedor.objects.create(nombre='Proveedor Externo S.A.')
        lote_vencido = Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=500,
            fecha_vencimiento=date.today() - timedelta(days=5),
            fecha_entrada=date.today() - timedelta(days=60),
        )
        payload = {
            'lote_id': lote_vencido.id,
            'proveedor_id': proveedor.id,
            'motivo': 'Lote vencido. Devolución acordada con proveedor.',
        }
        # Act
        response = self.client.post(
            '/api/v1/inventario/devoluciones/', payload, format='json'
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        lote_vencido.refresh_from_db()
        self.assertEqual(float(lote_vencido.cantidad), 0)

    # ── INV-011 ───────────────────────────────────────────────────────
    def test_inv_011_registrar_descarte_de_lote_vencido(self):
        """
        POST /inventario/descartes/ registra el descarte de un lote vencido.
        El stock del lote llega a 0 y el movimiento queda en bitácora.
        RF-INV-05
        """
        # Arrange
        lote_vencido = Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=200,
            fecha_vencimiento=date.today() - timedelta(days=3),
            fecha_entrada=date.today() - timedelta(days=45),
        )
        payload = {
            'lote_id': lote_vencido.id,
            'motivo': 'Descarte por vencimiento. Autorizado por Jefe de Producción.',
        }
        # Act
        response = self.client.post(
            '/api/v1/inventario/descartes/', payload, format='json'
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        lote_vencido.refresh_from_db()
        self.assertEqual(float(lote_vencido.cantidad), 0)

    # ── INV-012 ───────────────────────────────────────────────────────
    def test_inv_012_trazabilidad_lote_desde_recepcion_hasta_consumo(self):
        """
        La API de trazabilidad devuelve el historial completo de un
        lote: recepción → traslado → consumo en producción.
        RF-INV-01 (consulta detallada)
        """
        # Arrange — simular movimientos del lote
        MovimientoInventario.objects.create(
            tipo='RECEPCION',
            lote=self.lote,
            bodega_destino=self.bodega_principal,
            cantidad=20000,
            usuario=self.user,
            notas='Recepción OC-2026-001',
        )
        MovimientoInventario.objects.create(
            tipo='TRASLADO',
            lote=self.lote,
            bodega_origen=self.bodega_principal,
            bodega_destino=self.bodega_pdp,
            cantidad=5000,
            usuario=self.user,
        )
        # Act
        response = self.client.get(
            f'/api/v1/inventario/trazabilidad/{self.lote.id}/'
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tipos_en_historial = [m['tipo'] for m in response.data['movimientos']]
        self.assertIn('RECEPCION', tipos_en_historial)
        self.assertIn('TRASLADO', tipos_en_historial)
