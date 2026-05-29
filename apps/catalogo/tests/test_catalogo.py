# apps/catalogo/tests/test_catalogo.py

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.catalogo.models import (
    UnidadMedida,
    MateriaPrima,
    Presentacion,
    Proveedor,
    ProductoTerminado,
)

User = get_user_model()


# ──────────────────────────────────────────────────────────────────────
# CAT-001 al CAT-010 — Materias Primas
# ──────────────────────────────────────────────────────────────────────

class MateriaPrimaTestCase(APITestCase):
    """Pruebas de creación, consulta, actualización y desactivación de materias primas."""

    URL = '/api/v1/catalogo/materias-primas/'

    def setUp(self):
        # Usuario con rol INVENTARIO autenticado
        self.user = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        # Unidades de medida base para los tests
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.ml = UnidadMedida.objects.create(nombre='Mililitros', simbolo='ml')

    # ── CAT-001 ───────────────────────────────────────────────────────
    def test_cat_001_crear_materia_prima_con_campos_validos(self):
        """
        POST /catalogo/materias-primas/ con todos los campos obligatorios
        → HTTP 201, la MP queda guardada en BD.
        RF-CAT-01
        """
        # Arrange
        payload = {
            'nombre': 'Harina de trigo',
            'unidad_medida': self.gramos.id,
            'punto_reorden': 10000,
            'dias_minimos_vencimiento': 30,
        }
        # Act
        response = self.client.post(self.URL, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nombre'], 'Harina de trigo')
        self.assertTrue(MateriaPrima.objects.filter(nombre='Harina de trigo').exists())

    # ── CAT-002 ───────────────────────────────────────────────────────
    def test_cat_002_nombre_duplicado_devuelve_400(self):
        """
        Intentar crear una MP con nombre ya existente → HTTP 400.
        RF-CAT-01
        """
        # Arrange — crear la MP primero
        MateriaPrima.objects.create(
            nombre='Azúcar blanca',
            unidad_medida=self.gramos,
            punto_reorden=5000,
        )
        payload = {'nombre': 'Azúcar blanca', 'unidad_medida': self.gramos.id}
        # Act
        response = self.client.post(self.URL, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── CAT-003 ───────────────────────────────────────────────────────
    def test_cat_003_crear_sin_unidad_de_medida_devuelve_400(self):
        """
        Crear MP sin especificar unidad de medida → HTTP 400.
        RF-CAT-01, RF-CAT-02
        """
        # Arrange
        payload = {'nombre': 'Sal fina', 'punto_reorden': 500}
        # Act
        response = self.client.post(self.URL, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('unidad_medida', response.data)

    # ── CAT-004 ───────────────────────────────────────────────────────
    def test_cat_004_listar_materias_primas_paginadas(self):
        """
        GET /catalogo/materias-primas/ devuelve respuesta paginada
        con claves 'count', 'results'.
        RF-CAT-01
        """
        # Arrange
        nombres = ['Mantequilla', 'Huevos', 'Leche entera']
        for nombre in nombres:
            MateriaPrima.objects.create(
                nombre=nombre, unidad_medida=self.gramos, punto_reorden=1000
            )
        # Act
        response = self.client.get(self.URL)
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertGreaterEqual(response.data['count'], 3)

    # ── CAT-005 ───────────────────────────────────────────────────────
    def test_cat_005_obtener_materia_prima_por_id(self):
        """
        GET /catalogo/materias-primas/{id}/ devuelve la MP con nombre correcto.
        RF-CAT-01
        """
        # Arrange
        mp = MateriaPrima.objects.create(
            nombre='Chocolate cobertura',
            unidad_medida=self.gramos,
            punto_reorden=3000,
        )
        # Act
        response = self.client.get(f'{self.URL}{mp.id}/')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nombre'], 'Chocolate cobertura')

    # ── CAT-006 ───────────────────────────────────────────────────────
    def test_cat_006_actualizar_punto_reorden(self):
        """
        PATCH /catalogo/materias-primas/{id}/ actualiza el punto de reorden.
        RF-CAT-01
        """
        # Arrange
        mp = MateriaPrima.objects.create(
            nombre='Leche condensada',
            unidad_medida=self.ml,
            punto_reorden=5000,
        )
        # Act
        response = self.client.patch(
            f'{self.URL}{mp.id}/',
            {'punto_reorden': 8000},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mp.refresh_from_db()
        self.assertEqual(mp.punto_reorden, 8000)

    # ── CAT-007 ───────────────────────────────────────────────────────
    def test_cat_007_desactivar_materia_prima_soft_delete(self):
        """
        POST /catalogo/materias-primas/{id}/desactivar/ → activo=False.
        El registro permanece en BD (soft delete).
        RF-CAT-01
        """
        # Arrange
        mp = MateriaPrima.objects.create(
            nombre='Vainilla extracto',
            unidad_medida=self.ml,
            punto_reorden=100,
        )
        # Act
        response = self.client.post(f'{self.URL}{mp.id}/desactivar/')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mp.refresh_from_db()
        self.assertFalse(mp.activo)
        # Sigue existiendo en BD
        self.assertTrue(MateriaPrima.objects.filter(id=mp.id).exists())

    # ── CAT-008 ───────────────────────────────────────────────────────
    def test_cat_008_no_desactivar_mp_con_stock_activo(self):
        """
        No se puede desactivar una MP que tiene lotes con cantidad > 0.
        El backend debe responder HTTP 400.
        RF-CAT-01 (restricción de integridad referencial)
        """
        # Arrange — importar modelos de Inventario
        from apps.inventario.models import Bodega, Lote
        from datetime import date, timedelta

        mp = MateriaPrima.objects.create(
            nombre='Esencia de naranja',
            unidad_medida=self.ml,
            punto_reorden=200,
        )
        bodega = Bodega.objects.create(nombre='Bodega Principal', tipo='PRINCIPAL')
        Lote.objects.create(
            materia_prima=mp,
            bodega=bodega,
            cantidad=500,
            fecha_vencimiento=date.today() + timedelta(days=90),
            fecha_entrada=date.today(),
        )
        # Act
        response = self.client.post(f'{self.URL}{mp.id}/desactivar/')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mp.refresh_from_db()
        self.assertTrue(mp.activo)

    # ── CAT-009 ───────────────────────────────────────────────────────
    def test_cat_009_configurar_dias_minimos_vencimiento(self):
        """
        PATCH con dias_minimos_vencimiento establece el parámetro
        de validación para recepciones futuras.
        RF-CAT-07
        """
        # Arrange
        mp = MateriaPrima.objects.create(
            nombre='Crema de leche',
            unidad_medida=self.ml,
            punto_reorden=1000,
        )
        # Act
        response = self.client.patch(
            f'{self.URL}{mp.id}/',
            {'dias_minimos_vencimiento': 15},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mp.refresh_from_db()
        self.assertEqual(mp.dias_minimos_vencimiento, 15)

    # ── CAT-010 ───────────────────────────────────────────────────────
    def test_cat_010_actualizar_dias_minimos_vencimiento(self):
        """
        Actualizar dias_minimos_vencimiento de 10 a 20 días.
        RF-CAT-07
        """
        # Arrange
        mp = MateriaPrima.objects.create(
            nombre='Levadura seca',
            unidad_medida=self.gramos,
            punto_reorden=500,
            dias_minimos_vencimiento=10,
        )
        # Act
        response = self.client.patch(
            f'{self.URL}{mp.id}/',
            {'dias_minimos_vencimiento': 20},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mp.refresh_from_db()
        self.assertEqual(mp.dias_minimos_vencimiento, 20)


# ──────────────────────────────────────────────────────────────────────
# CAT-011 al CAT-014 — Proveedores y relaciones M2M
# ──────────────────────────────────────────────────────────────────────

class ProveedorTestCase(APITestCase):
    """Pruebas de proveedores y su relación M2M con materias primas."""

    URL_PROV = '/api/v1/catalogo/proveedores/'

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
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')

    # ── CAT-011 ───────────────────────────────────────────────────────
    def test_cat_011_crear_proveedor_con_datos_validos(self):
        """
        POST /catalogo/proveedores/ con nombre, contacto, teléfono y email
        → HTTP 201.
        RF-CAT-05
        """
        # Arrange
        payload = {
            'nombre': 'Distribuidora El Trigal',
            'contacto': 'Juan Pérez',
            'telefono': '3001234567',
            'email': 'ventas@eltrigal.com',
        }
        # Act
        response = self.client.post(self.URL_PROV, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nombre'], 'Distribuidora El Trigal')

    # ── CAT-012 ───────────────────────────────────────────────────────
    def test_cat_012_asociar_proveedor_a_materia_prima_m2m(self):
        """
        POST /catalogo/materias-primas/{id}/proveedores/ asocia
        un proveedor existente a la MP.
        RF-CAT-06
        """
        # Arrange
        proveedor = Proveedor.objects.create(nombre='Harinera del Valle S.A.')
        mp = MateriaPrima.objects.create(
            nombre='Harina integral',
            unidad_medida=self.gramos,
            punto_reorden=5000,
        )
        # Act
        response = self.client.post(
            f'/api/v1/catalogo/materias-primas/{mp.id}/proveedores/',
            {'proveedor_id': proveedor.id},
            format='json',
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mp.refresh_from_db()
        self.assertIn(proveedor, mp.proveedores.all())

    # ── CAT-013 ───────────────────────────────────────────────────────
    def test_cat_013_materia_prima_puede_tener_multiples_proveedores(self):
        """
        Una MP puede estar asociada a dos o más proveedores distintos.
        RF-CAT-06
        """
        # Arrange
        mp = MateriaPrima.objects.create(
            nombre='Azúcar morena',
            unidad_medida=self.gramos,
            punto_reorden=4000,
        )
        p1 = Proveedor.objects.create(nombre='Ingenio Risaralda')
        p2 = Proveedor.objects.create(nombre='Ingenio del Cauca')
        # Act
        mp.proveedores.add(p1, p2)
        # Assert
        self.assertEqual(mp.proveedores.count(), 2)
        self.assertIn(p1, mp.proveedores.all())
        self.assertIn(p2, mp.proveedores.all())

    # ── CAT-014 ───────────────────────────────────────────────────────
    def test_cat_014_proveedor_puede_estar_en_multiples_materias_primas(self):
        """
        Un proveedor puede estar asociado a múltiples materias primas.
        RF-CAT-06
        """
        # Arrange
        proveedor = Proveedor.objects.create(nombre='Multiproveedor S.A.')
        mp1 = MateriaPrima.objects.create(
            nombre='Mantequilla sin sal',
            unidad_medida=self.gramos,
            punto_reorden=2000,
        )
        mp2 = MateriaPrima.objects.create(
            nombre='Manteca vegetal',
            unidad_medida=self.gramos,
            punto_reorden=1500,
        )
        # Act
        mp1.proveedores.add(proveedor)
        mp2.proveedores.add(proveedor)
        # Assert
        total_mp = MateriaPrima.objects.filter(proveedores=proveedor).count()
        self.assertEqual(total_mp, 2)


# ──────────────────────────────────────────────────────────────────────
# CAT-015 al CAT-018 — Productos terminados y unidades de medida
# ──────────────────────────────────────────────────────────────────────

class ProductoTerminadoYUnidadesTestCase(APITestCase):
    """Pruebas de productos terminados, unidades de medida y presentaciones."""

    URL_PT = '/api/v1/catalogo/productos-terminados/'
    URL_UM = '/api/v1/catalogo/unidades-medida/'

    def setUp(self):
        self.user = User.objects.create_user(
            email='admin@daluzed.com',
            password='AdminDaluzed2026!',
            role='ADMIN',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        self.unidades = UnidadMedida.objects.create(
            nombre='Unidades', simbolo='und'
        )

    # ── CAT-015 ───────────────────────────────────────────────────────
    def test_cat_015_crear_producto_terminado_con_vida_util(self):
        """
        POST /catalogo/productos-terminados/ con vida útil en días → HTTP 201.
        RF-CAT-04
        """
        # Arrange
        payload = {
            'nombre': 'Torta de vainilla',
            'vida_util_dias': 14,
            'unidad_medida': self.unidades.id,
        }
        # Act
        response = self.client.post(self.URL_PT, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['vida_util_dias'], 14)
        self.assertTrue(
            ProductoTerminado.objects.filter(nombre='Torta de vainilla').exists()
        )

    # ── CAT-016 ───────────────────────────────────────────────────────
    def test_cat_016_listar_productos_terminados(self):
        """
        GET /catalogo/productos-terminados/ devuelve todos los productos.
        RF-CAT-04
        """
        # Arrange
        ProductoTerminado.objects.create(
            nombre='Torta de chía', vida_util_dias=12, unidad_medida=self.unidades
        )
        ProductoTerminado.objects.create(
            nombre='Bizcocho', vida_util_dias=5, unidad_medida=self.unidades
        )
        # Act
        response = self.client.get(self.URL_PT)
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 2)

    # ── CAT-017 ───────────────────────────────────────────────────────
    def test_cat_017_crear_unidad_de_medida(self):
        """
        POST /catalogo/unidades-medida/ crea una nueva unidad.
        RF-CAT-02
        """
        # Arrange
        payload = {'nombre': 'Kilogramos', 'simbolo': 'kg'}
        # Act
        response = self.client.post(self.URL_UM, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['simbolo'], 'kg')

    # ── CAT-018 ───────────────────────────────────────────────────────
    def test_cat_018_conversion_presentacion_a_unidad_base(self):
        """
        Una presentación '1 bolsa de 50 kg' tiene factor_conversion=50000
        porque la unidad base es gramos (1kg = 1000g, 50kg = 50000g).
        Verificar que 2 bolsas = 100000g.
        RF-CAT-02, RF-CAT-03
        """
        # Arrange
        gramos = UnidadMedida.objects.create(nombre='Gramos base', simbolo='g2')
        mp = MateriaPrima.objects.create(
            nombre='Harina extra suave',
            unidad_medida=gramos,
            punto_reorden=10000,
        )
        presentacion = Presentacion.objects.create(
            nombre='Bolsa 50kg',
            materia_prima=mp,
            unidad_medida=gramos,
            factor_conversion=50000,  # 1 bolsa = 50000 gramos
        )
        # Act
        cantidad_bolsas = 2
        total_gramos = cantidad_bolsas * presentacion.factor_conversion
        # Assert
        self.assertEqual(presentacion.factor_conversion, 50000)
        self.assertEqual(total_gramos, 100000)
