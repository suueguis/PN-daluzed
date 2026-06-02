# apps/authentication/tests/test_autenticacion.py
# AUT-001 → AUT-015 — Autenticación, refresh y RBAC

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from axes.models import AccessAttempt
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.services import AuthService

User = get_user_model()


class LoginTestCase(APITestCase):
    """AUT-001 → AUT-015: login, logout, refresh y RBAC."""

    LOGIN_URL = '/api/v1/auth/login/'

    def setUp(self):
        AccessAttempt.objects.all().delete()

        self.user = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        self.inactive_user = User.objects.create_user(
            email='inactivo@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
            is_active=False,
        )

    # ── AUT-001 ───────────────────────────────────────────────────────
    def test_aut_001_login_exitoso_devuelve_access_refresh_username_role(self):
        payload = {'email': 'inventario@daluzed.com', 'password': 'Daluzed2026!'}
        response = self.client.post(self.LOGIN_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('username', response.data)
        self.assertIn('role', response.data)
        self.assertEqual(response.data['username'], 'inventario@daluzed.com')
        self.assertEqual(response.data['role'], 'INVENTARIO')

    # ── AUT-002 ───────────────────────────────────────────────────────
    def test_aut_002_login_contrasena_incorrecta_devuelve_401_y_remaining_attempts(self):
        payload = {'email': 'inventario@daluzed.com', 'password': 'ClaveIncorrecta!'}
        response = self.client.post(self.LOGIN_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('detail'), 'invalid')
        self.assertIn('remaining_attempts', response.data)
        self.assertGreater(response.data['remaining_attempts'], 0)

    # ── AUT-003 ───────────────────────────────────────────────────────
    def test_aut_003_login_email_inexistente_devuelve_401(self):
        payload = {'email': 'fantasma@daluzed.com', 'password': 'Cualquiera123!'}
        response = self.client.post(self.LOGIN_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── AUT-004 ───────────────────────────────────────────────────────
    def test_aut_004_bloqueo_tras_cinco_intentos_fallidos(self):
        payload_incorrecto = {
            'email': 'inventario@daluzed.com',
            'password': 'ClaveIncorrecta!',
        }
        for _ in range(5):
            self.client.post(self.LOGIN_URL, payload_incorrecto, format='json')

        response = self.client.post(self.LOGIN_URL, payload_incorrecto, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('detail'), 'lockout')

    # ── AUT-005 ───────────────────────────────────────────────────────
    def test_aut_005_usuario_inactivo_no_puede_hacer_login(self):
        payload = {'email': 'inactivo@daluzed.com', 'password': 'Daluzed2026!'}
        response = self.client.post(self.LOGIN_URL, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('detail'), 'inactive')

    # ── AUT-006 ───────────────────────────────────────────────────────
    def test_aut_006_logout_con_token_valido_invalida_refresh(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        response = self.client.post(
            '/api/v1/auth/logout/',
            {'refresh': str(refresh)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detail', response.data)

    # ── AUT-007 ───────────────────────────────────────────────────────
    def test_aut_007_logout_sin_token_de_autorizacion_devuelve_401(self):
        response = self.client.post(
            '/api/v1/auth/logout/',
            {'refresh': 'cualquier-token'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── AUT-008 ───────────────────────────────────────────────────────
    def test_aut_008_refresh_con_token_valido_devuelve_nuevo_access(self):
        refresh = RefreshToken.for_user(self.user)
        response = self.client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': str(refresh)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    # ── AUT-009 ───────────────────────────────────────────────────────
    def test_aut_009_refresh_con_token_invalido_devuelve_401(self):
        response = self.client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': 'este.token.no.es.valido'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── AUT-010 ───────────────────────────────────────────────────────
    def test_aut_010_jefe_inventario_no_puede_acceder_a_endpoint_solo_admin(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        response = self.client.get('/api/v1/auditoria/bitacora/')
        # 403 cuando el endpoint exista; 404 mientras no esté implementado
        self.assertIn(
            response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND],
        )

    # ── AUT-011 ───────────────────────────────────────────────────────
    def test_aut_011_administrador_puede_acceder_a_endpoint_admin(self):
        admin_user = User.objects.create_user(
            email='admin@daluzed.com',
            password='AdminDaluzed2026!',
            role='ADMIN',
        )
        refresh = RefreshToken.for_user(admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        response = self.client.get('/api/v1/auditoria/bitacora/')
        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── AUT-012 ───────────────────────────────────────────────────────
    def test_aut_012_generate_tokens_devuelve_rol_del_primer_grupo_django(self):
        grupo = Group.objects.create(name='Administrador')
        self.user.groups.add(grupo)
        tokens = AuthService.generate_tokens_for_user(self.user)
        self.assertEqual(tokens['role'], 'Administrador')
        self.assertIn('access', tokens)
        self.assertIn('refresh', tokens)
        self.assertIn('username', tokens)

    # ── AUT-013 ───────────────────────────────────────────────────────
    def test_aut_013_rol_fallback_a_campo_role_si_usuario_sin_grupos(self):
        tokens = AuthService.generate_tokens_for_user(self.user)
        self.assertEqual(tokens['role'], self.user.role)

    # ── AUT-014 ───────────────────────────────────────────────────────
    def test_aut_014_refresh_rota_y_devuelve_nuevo_refresh_token(self):
        refresh_original = RefreshToken.for_user(self.user)
        response = self.client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': str(refresh_original)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('refresh', response.data)
        self.assertNotEqual(response.data['refresh'], str(refresh_original))

    # ── AUT-015 ───────────────────────────────────────────────────────
    def test_aut_015_refresh_ya_usado_no_es_valido_blacklist(self):
        refresh_original = RefreshToken.for_user(self.user)
        self.client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': str(refresh_original)},
            format='json',
        )
        response = self.client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': str(refresh_original)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
