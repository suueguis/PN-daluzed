from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.inventario.models import Bodega, ZonaBodega

User = get_user_model()
URL = '/api/v1/inventario/zonas/'


class ZonaBodegaTestCase(APITestCase):
    """CRUD de zonas de bodega."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@daluzed.com', password='Pass123!', role='ADMIN'
        )
        self.inventario = User.objects.create_user(
            email='inv@daluzed.com', password='Pass123!', role='INVENTARIO'
        )
        self.gerente = User.objects.create_user(
            email='gerente@daluzed.com', password='Pass123!', role='GERENTE'
        )
        self.bodega = Bodega.objects.create(nombre='Bodega Principal', tipo='PRINCIPAL')
        self._auth(self.admin)

    def _auth(self, user):
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(token)}')

    # ── Crear ──────────────────────────────────────────────────────────────
    def test_crear_zona(self):
        r = self.client.post(URL, {'bodega': self.bodega.id, 'nombre': 'Estante A', 'descripcion': 'Nivel superior'})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ZonaBodega.objects.count(), 1)
        self.assertEqual(r.data['nombre'], 'Estante A')

    def test_crear_zona_rol_inventario(self):
        self._auth(self.inventario)
        r = self.client.post(URL, {'bodega': self.bodega.id, 'nombre': 'Refrigeración'})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_crear_zona_rol_gerente_denegado(self):
        self._auth(self.gerente)
        r = self.client.post(URL, {'bodega': self.bodega.id, 'nombre': 'Zona X'})
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    # ── Listar / filtrar ───────────────────────────────────────────────────
    def test_listar_zonas_por_bodega(self):
        otra = Bodega.objects.create(nombre='PDP', tipo='PDP')
        ZonaBodega.objects.create(bodega=self.bodega, nombre='A')
        ZonaBodega.objects.create(bodega=self.bodega, nombre='B')
        ZonaBodega.objects.create(bodega=otra,        nombre='C')

        r = self.client.get(URL, {'bodega': self.bodega.id})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 2)

    def test_listar_todas_las_zonas(self):
        otra = Bodega.objects.create(nombre='PDP', tipo='PDP')
        ZonaBodega.objects.create(bodega=self.bodega, nombre='A')
        ZonaBodega.objects.create(bodega=otra,        nombre='B')

        r = self.client.get(URL)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 2)

    # ── Actualizar / eliminar ──────────────────────────────────────────────
    def test_actualizar_zona(self):
        zona = ZonaBodega.objects.create(bodega=self.bodega, nombre='Viejo')
        r = self.client.patch(f'{URL}{zona.id}/', {'nombre': 'Nuevo'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        zona.refresh_from_db()
        self.assertEqual(zona.nombre, 'Nuevo')

    def test_eliminar_zona(self):
        zona = ZonaBodega.objects.create(bodega=self.bodega, nombre='Temporal')
        r = self.client.delete(f'{URL}{zona.id}/')
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ZonaBodega.objects.count(), 0)

    # ── Bodega incluye zonas en su serializer ──────────────────────────────
    def test_bodega_incluye_zonas(self):
        ZonaBodega.objects.create(bodega=self.bodega, nombre='A')
        ZonaBodega.objects.create(bodega=self.bodega, nombre='B')
        r = self.client.get(f'/api/v1/inventario/bodegas/{self.bodega.id}/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data['zonas']), 2)
