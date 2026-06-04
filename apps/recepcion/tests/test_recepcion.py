# apps/recepcion/tests/test_recepcion.py

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date, timedelta

from apps.catalogo.models import (
    UnidadMedida, MateriaPrima, Presentacion, Proveedor
)
from apps.inventario.models import Bodega, Lote
from apps.recepcion.models import OrdenCompra, DetalleOrdenCompra, RecepcionMercancia

User = get_user_model()

URL_RECEPCION = '/api/v1/recepcion/'


class RecepcionMercanciaTestCase(APITestCase):
    """
    REC-001 al REC-010: Validación de recepciones contra orden de compra,
    conversión de unidades, creación de lotes y regla de días mínimos.
    """

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
        # Catálogo base
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.proveedor = Proveedor.objects.create(
            nombre='Distribuidora Andina', telefono='3109876543'
        )
        self.mp_harina = MateriaPrima.objects.create(
            nombre='Harina de trigo',
            unidad_medida=self.gramos,
            punto_reorden=10000,
            dias_minimos_vencimiento=30,
        )
        self.presentacion_bolsa = Presentacion.objects.create(
            nombre='Bolsa 50kg',
            materia_prima=self.mp_harina,
            unidad_medida=self.gramos,
            factor_conversion=50000,
        )
        self.bodega_principal = Bodega.objects.create(
            nombre='Bodega Principal', tipo='PRINCIPAL'
        )
        # Orden de compra abierta
        self.oc = OrdenCompra.objects.create(
            proveedor=self.proveedor,
            fecha_creacion=date.today(),
            estado='PENDIENTE',
            usuario_creador=self.user,
        )
        DetalleOrdenCompra.objects.create(
            orden=self.oc,
            materia_prima=self.mp_harina,
            cantidad_presentacion=10,
            presentacion=self.presentacion_bolsa,
        )

    # ── REC-001 ───────────────────────────────────────────────────────
    def test_rec_001_recepcion_exitosa_contra_orden_de_compra(self):
        """
        POST /recepcion/ con orden de compra válida → HTTP 201,
        se crea la RecepcionMercancia y el lote correspondiente.
        RF-REC-01
        """
        # Arrange
        fecha_vencimiento = date.today() + timedelta(days=120)
        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 5,
                    'fecha_vencimiento': str(fecha_vencimiento),
                    'numero_lote': 'LOT-2026-001',
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            RecepcionMercancia.objects.filter(orden_compra=self.oc).exists()
        )

    # ── REC-002 ───────────────────────────────────────────────────────
    def test_rec_002_recepcion_sin_orden_compra_es_rechazada(self):
        """
        POST /recepcion/ sin referencia a una OC válida → HTTP 400.
        RF-REC-01
        """
        # Arrange
        payload = {
            'orden_compra_id': 99999,  # ID inexistente
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 2,
                    'fecha_vencimiento': str(date.today() + timedelta(days=60)),
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── REC-003 ───────────────────────────────────────────────────────
    def test_rec_003_conversion_automatica_presentacion_a_unidad_base(self):
        """
        Al recibir 3 bolsas de 50kg (factor=50000g/bolsa), el lote
        creado debe tener cantidad = 3 × 50000 = 150000 gramos.
        RF-REC-02
        """
        # Arrange
        fecha_vencimiento = date.today() + timedelta(days=120)
        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 3,
                    'fecha_vencimiento': str(fecha_vencimiento),
                    'numero_lote': 'LOT-2026-002',
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        lote = Lote.objects.filter(
            materia_prima=self.mp_harina,
            bodega=self.bodega_principal,
        ).order_by('-id').first()
        self.assertIsNotNone(lote)
        self.assertEqual(float(lote.cantidad), 150000.0)  # 3 bolsas × 50000g

    # ── REC-004 ───────────────────────────────────────────────────────
    def test_rec_004_lote_creado_con_fecha_vencimiento_correcta(self):
        """
        El lote generado en la recepción tiene la fecha de vencimiento
        exacta que se indicó en el detalle.
        RF-REC-03
        """
        # Arrange
        fecha_vencimiento = date.today() + timedelta(days=90)
        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 2,
                    'fecha_vencimiento': str(fecha_vencimiento),
                    'numero_lote': 'LOT-2026-003',
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        lote = Lote.objects.filter(numero_lote='LOT-2026-003').first()
        self.assertIsNotNone(lote)
        self.assertEqual(lote.fecha_vencimiento, fecha_vencimiento)

    # ── REC-005 ───────────────────────────────────────────────────────
    def test_rec_005_stock_bodega_principal_incrementa_tras_recepcion(self):
        """
        Después de confirmar la recepción, el stock de Bodega Principal
        para la MP debe haber aumentado.
        RF-REC-04
        """
        # Arrange
        from django.db.models import Sum
        stock_antes = Lote.objects.filter(
            materia_prima=self.mp_harina,
            bodega=self.bodega_principal,
        ).aggregate(total=Sum('cantidad'))['total'] or 0

        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 4,  # 4 × 50000 = 200000g
                    'fecha_vencimiento': str(date.today() + timedelta(days=100)),
                    'numero_lote': 'LOT-2026-004',
                }
            ],
        }
        # Act
        self.client.post(URL_RECEPCION, payload, format='json')
        from django.db.models import Sum as S
        stock_despues = Lote.objects.filter(
            materia_prima=self.mp_harina,
            bodega=self.bodega_principal,
        ).aggregate(total=S('cantidad'))['total'] or 0
        # Assert
        self.assertGreater(float(stock_despues), float(stock_antes))

    # ── REC-006 ───────────────────────────────────────────────────────
    def test_rec_006_recepcion_confirmada_es_inmutable(self):
        """
        Una RecepcionMercancia confirmada no puede editarse ni borrarse.
        RF-REC-05
        """
        # Arrange — crear y confirmar una recepción
        recepcion = RecepcionMercancia.objects.create(
            orden_compra=self.oc,
            fecha=date.today(),
            usuario=self.user,
            confirmada=True,
        )
        # Act — intentar modificar
        patch_response = self.client.patch(
            f'{URL_RECEPCION}{recepcion.id}/',
            {'confirmada': False},
            format='json',
        )
        delete_response = self.client.delete(
            f'{URL_RECEPCION}{recepcion.id}/'
        )
        # Assert
        self.assertIn(
            patch_response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED],
        )
        self.assertIn(
            delete_response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED],
        )

    # ── REC-007 ───────────────────────────────────────────────────────
    def test_rec_007_lote_con_vida_util_suficiente_pasa_validacion(self):
        """
        Si fecha_vencimiento − hoy >= dias_minimos_vencimiento (30 días),
        la recepción se acepta normalmente.
        RF-REC-06
        """
        # Arrange — vence en 60 días, mínimo requerido: 30 días → OK
        fecha_vencimiento = date.today() + timedelta(days=60)
        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 1,
                    'fecha_vencimiento': str(fecha_vencimiento),
                    'numero_lote': 'LOT-2026-005',
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ── REC-008 ───────────────────────────────────────────────────────
    def test_rec_008_vida_util_insuficiente_genera_alerta_bloqueante(self):
        """
        Si fecha_vencimiento − hoy < dias_minimos_vencimiento (30 días),
        la recepción no se procesa y devuelve HTTP 400 con alerta bloqueante.
        RF-REC-06
        """
        # Arrange — vence en 10 días, mínimo requerido: 30 días → BLOQUEANTE
        fecha_vencimiento = date.today() + timedelta(days=10)
        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 1,
                    'fecha_vencimiento': str(fecha_vencimiento),
                    'numero_lote': 'LOT-2026-006',
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert — HTTP 422 Unprocessable Entity o 400
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY],
        )
        self.assertIn('dias_minimos', str(response.data).lower())

    # ── REC-009 ───────────────────────────────────────────────────────
    def test_rec_009_vida_util_insuficiente_con_justificacion_puede_continuar(self):
        """
        Si vida útil < mínimo PERO se provee justificación_vencimiento,
        la recepción se acepta con advertencia.
        RF-REC-06
        """
        # Arrange
        fecha_vencimiento = date.today() + timedelta(days=10)
        payload = {
            'orden_compra_id': self.oc.id,
            'justificacion_vencimiento': (
                'Proveedor confirmó que el lote es válido. '
                'Autorizado por Gerencia.'
            ),
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 1,
                    'fecha_vencimiento': str(fecha_vencimiento),
                    'numero_lote': 'LOT-2026-007',
                }
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # La justificación queda guardada
        rec = RecepcionMercancia.objects.order_by('-id').first()
        self.assertIn('Gerencia', rec.justificacion_vencimiento)

    # ── REC-010 ───────────────────────────────────────────────────────
    def test_rec_010_multiples_lotes_mismo_producto_en_una_recepcion(self):
        """
        Una recepción puede incluir el mismo producto en dos detalles
        con distintos números de lote y fechas de vencimiento.
        Ambos lotes se crean en Bodega Principal.
        RF-REC-03
        """
        # Arrange
        payload = {
            'orden_compra_id': self.oc.id,
            'detalles': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 2,
                    'fecha_vencimiento': str(date.today() + timedelta(days=80)),
                    'numero_lote': 'LOT-A',
                },
                {
                    'materia_prima_id': self.mp_harina.id,
                    'presentacion_id': self.presentacion_bolsa.id,
                    'cantidad_presentacion': 3,
                    'fecha_vencimiento': str(date.today() + timedelta(days=90)),
                    'numero_lote': 'LOT-B',
                },
            ],
        }
        # Act
        response = self.client.post(URL_RECEPCION, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Lote.objects.filter(numero_lote='LOT-A').exists())
        self.assertTrue(Lote.objects.filter(numero_lote='LOT-B').exists())


URL_ORDENES = '/api/v1/recepcion/ordenes/'


class OrdenCompraProveedorActivoTestCase(APITestCase):
    """0.6: una OC no debe crearse contra un proveedor inactivo."""

    def setUp(self) -> None:
        self.user = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        self.proveedor_activo = Proveedor.objects.create(
            nombre='Proveedor Activo', activo=True,
        )
        self.proveedor_inactivo = Proveedor.objects.create(
            nombre='Proveedor Inactivo', activo=False,
        )

    def test_oc_con_proveedor_activo_se_crea(self) -> None:
        response = self.client.post(
            URL_ORDENES,
            {'proveedor_id': self.proveedor_activo.id, 'detalles': []},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(OrdenCompra.objects.count(), 1)

    def test_oc_con_proveedor_inactivo_es_rechazada(self) -> None:
        response = self.client.post(
            URL_ORDENES,
            {'proveedor_id': self.proveedor_inactivo.id, 'detalles': []},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(OrdenCompra.objects.count(), 0)
        self.assertIn('proveedor', response.json())
        self.assertIn('inactivo', str(response.json()['proveedor']).lower())
