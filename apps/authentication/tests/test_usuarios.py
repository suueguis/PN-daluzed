# apps/authentication/tests/test_usuarios.py
# Gestión de usuarios — RF-AUT-04

from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

USUARIOS_URL = '/api/v1/auth/usuarios/'
LOGIN_URL = '/api/v1/auth/login/'


def _token(user: User) -> str:
    return str(RefreshToken.for_user(user).access_token)


def _auth(client, user: User) -> None:
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {_token(user)}')


class UserViewSetListTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@daluzed.com', password='Daluzed2026!', role='ADMIN'
        )
        self.inventario = User.objects.create_user(
            email='inv@daluzed.com', password='Daluzed2026!', role='INVENTARIO'
        )

    def test_admin_puede_listar_usuarios(self):
        _auth(self.client, self.admin)
        response = self.client.get(USUARIOS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [u['email'] for u in response.data]
        self.assertIn('admin@daluzed.com', emails)

    def test_no_admin_no_puede_listar(self):
        _auth(self.client, self.inventario)
        response = self.client.get(USUARIOS_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonimo_no_puede_listar(self):
        response = self.client.get(USUARIOS_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserViewSetCreateTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@daluzed.com', password='Daluzed2026!', role='ADMIN'
        )

    def test_admin_crea_usuario_valido(self):
        _auth(self.client, self.admin)
        payload = {
            'email': 'nuevo@daluzed.com',
            'password': 'Daluzed2026!',
            'role': 'PRODUCCION',
        }
        response = self.client.post(USUARIOS_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], 'nuevo@daluzed.com')
        self.assertNotIn('password', response.data)

    def test_password_debil_devuelve_400(self):
        _auth(self.client, self.admin)
        payload = {
            'email': 'debil@daluzed.com',
            'password': '123',
            'role': 'INVENTARIO',
        }
        response = self.client.post(USUARIOS_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_email_duplicado_devuelve_400(self):
        _auth(self.client, self.admin)
        payload = {
            'email': 'admin@daluzed.com',
            'password': 'Daluzed2026!',
            'role': 'INVENTARIO',
        }
        response = self.client.post(USUARIOS_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserViewSetPatchTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@daluzed.com', password='Daluzed2026!', role='ADMIN'
        )
        self.otro = User.objects.create_user(
            email='otro@daluzed.com', password='Daluzed2026!', role='INVENTARIO'
        )

    def test_admin_puede_cambiar_rol(self):
        _auth(self.client, self.admin)
        url = f'{USUARIOS_URL}{self.otro.pk}/'
        response = self.client.patch(url, {'role': 'GERENTE'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.otro.refresh_from_db()
        self.assertEqual(self.otro.role, 'GERENTE')

    def test_admin_no_puede_cambiar_su_propio_rol(self):
        _auth(self.client, self.admin)
        url = f'{USUARIOS_URL}{self.admin.pk}/'
        response = self.client.patch(url, {'role': 'INVENTARIO'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.role, 'ADMIN')

    def test_patch_no_acepta_password(self):
        _auth(self.client, self.admin)
        url = f'{USUARIOS_URL}{self.otro.pk}/'
        old_password = self.otro.password
        response = self.client.patch(url, {'password': 'NuevaPass123!'}, format='json')
        # 200 is fine but password must not change (field is ignored)
        self.otro.refresh_from_db()
        self.assertEqual(self.otro.password, old_password)


class UserViewSetDesactivarTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@daluzed.com', password='Daluzed2026!', role='ADMIN'
        )
        self.otro = User.objects.create_user(
            email='otro@daluzed.com', password='Daluzed2026!', role='INVENTARIO'
        )

    def test_admin_puede_desactivar_otro_usuario(self):
        _auth(self.client, self.admin)
        url = f'{USUARIOS_URL}{self.otro.pk}/desactivar/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.otro.refresh_from_db()
        self.assertFalse(self.otro.is_active)

    def test_admin_no_puede_desactivarse_a_si_mismo(self):
        _auth(self.client, self.admin)
        url = f'{USUARIOS_URL}{self.admin.pk}/desactivar/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_login_de_usuario_inactivo_falla_con_inactive(self):
        """Regresión: desactivar → login debe devolver 401 con detail='inactive'."""
        _auth(self.client, self.admin)
        self.client.post(f'{USUARIOS_URL}{self.otro.pk}/desactivar/')
        self.client.credentials()  # clear auth
        payload = {'email': 'otro@daluzed.com', 'password': 'Daluzed2026!'}
        response = self.client.post(LOGIN_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('detail'), 'inactive')
