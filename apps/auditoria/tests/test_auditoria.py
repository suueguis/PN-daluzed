from datetime import date, timedelta

from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from apps.auditoria.models import BitacoraOperacion
from apps.auditoria.services import registrar_operacion

User = get_user_model()
URL_BITACORA = '/api/v1/auditoria/bitacora/'


class BitacoraModelTestCase(APITestCase):
    """AUD-001..003: Modelo BitacoraOperacion y utilidad registrar_operacion."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@daluzed.com', password='Admin2026!', role='ADMIN',
        )
        self.gerente = User.objects.create_user(
            email='gerente@daluzed.com', password='Gerente2026!', role='GERENTE',
        )

    # ── AUD-001 ───────────────────────────────────────────────────────
    def test_aud_001_registrar_operacion_crea_entrada(self):
        """
        registrar_operacion() crea un registro BitacoraOperacion con
        los datos correctos y no lanza excepciones.
        RF-AUT-05
        """
        registrar_operacion(
            self.admin, 'LOGIN', {'email': self.admin.email}, ip='127.0.0.1'
        )
        entrada = BitacoraOperacion.objects.filter(
            usuario=self.admin, accion='LOGIN'
        ).first()
        self.assertIsNotNone(entrada)
        self.assertEqual(entrada.ip, '127.0.0.1')
        self.assertEqual(entrada.detalle['email'], self.admin.email)

    # ── AUD-002 ───────────────────────────────────────────────────────
    def test_aud_002_registrar_operacion_usuario_null(self):
        """
        registrar_operacion() acepta usuario=None sin lanzar excepción.
        RF-AUT-05
        """
        registrar_operacion(None, 'LOGIN', {'email': 'anon'}, ip='10.0.0.1')
        entrada = BitacoraOperacion.objects.filter(usuario=None, accion='LOGIN').first()
        self.assertIsNotNone(entrada)

    # ── AUD-003 ───────────────────────────────────────────────────────
    def test_aud_003_solo_admin_puede_ver_bitacora(self):
        """
        GET /auditoria/bitacora/ devuelve 403 para roles no ADMIN.
        RF-AUD-03
        """
        refresh = RefreshToken.for_user(self.gerente)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        response = self.client.get(URL_BITACORA)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class BitacoraEndpointTestCase(APITestCase):
    """AUD-004..006: Endpoint de bitácora para ADMIN."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin2@daluzed.com', password='Admin2026!', role='ADMIN',
        )
        refresh = RefreshToken.for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')

        registrar_operacion(self.admin, 'LOGIN',    {'email': self.admin.email}, ip='1.2.3.4')
        registrar_operacion(self.admin, 'LOGOUT',   {'email': self.admin.email}, ip='1.2.3.4')
        registrar_operacion(self.admin, 'TRASLADO', {'movimiento_id': 99},       ip='1.2.3.5')

    # ── AUD-004 ───────────────────────────────────────────────────────
    def test_aud_004_admin_lista_bitacora(self):
        """
        GET /auditoria/bitacora/ devuelve 200 y estructura correcta para ADMIN.
        RF-AUD-03
        """
        response = self.client.get(URL_BITACORA)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('bitacora', response.data)
        self.assertIn('total', response.data)
        self.assertGreaterEqual(response.data['total'], 3)

    # ── AUD-005 ───────────────────────────────────────────────────────
    def test_aud_005_filtro_por_accion(self):
        """
        ?accion=TRASLADO devuelve solo entradas con esa acción.
        RF-AUD-03
        """
        response = self.client.get(URL_BITACORA, {'accion': 'TRASLADO'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        acciones = {e['accion'] for e in response.data['bitacora']}
        self.assertEqual(acciones, {'TRASLADO'})

    # ── AUD-006 ───────────────────────────────────────────────────────
    def test_aud_006_estructura_de_entrada(self):
        """
        Cada entrada de la bitácora tiene los campos requeridos.
        RF-AUD-03
        """
        response = self.client.get(URL_BITACORA)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['bitacora']), 0)
        primera = response.data['bitacora'][0]
        for campo in ('id', 'usuario', 'accion', 'detalle', 'ip', 'fecha'):
            self.assertIn(campo, primera)
