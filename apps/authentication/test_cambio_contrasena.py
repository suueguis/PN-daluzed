# apps/authentication/test_cambio_contrasena.py
# Item 2.5 — Cambio de contraseña desde el perfil

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class CambioContrasenaTestCase(APITestCase):
    URL = '/api/v1/auth/cambiar-contrasena/'
    CURRENT_PWD = 'Daluzed2026!'
    NEW_PWD = 'NuevaClave2026$'

    def setUp(self):
        self.user = User.objects.create_user(
            email='inventario@daluzed.com',
            password=self.CURRENT_PWD,
            role='INVENTARIO',
        )
        self.client.force_authenticate(user=self.user)

    def _payload(self, **overrides):
        data = {
            'contrasena_actual': self.CURRENT_PWD,
            'nueva_contrasena': self.NEW_PWD,
            'confirmar_contrasena': self.NEW_PWD,
        }
        data.update(overrides)
        return data

    def test_cambio_exitoso_actualiza_contrasena(self):
        response = self.client.post(self.URL, self._payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.NEW_PWD))
        self.assertFalse(self.user.check_password(self.CURRENT_PWD))

    def test_contrasena_actual_incorrecta_devuelve_400(self):
        response = self.client.post(
            self.URL,
            self._payload(contrasena_actual='clave-equivocada'),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('contrasena_actual', response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.CURRENT_PWD))

    def test_confirmacion_no_coincide_devuelve_400(self):
        response = self.client.post(
            self.URL,
            self._payload(confirmar_contrasena='OtraDistinta2026$'),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('confirmar_contrasena', response.data)

    def test_nueva_igual_a_actual_devuelve_400(self):
        response = self.client.post(
            self.URL,
            self._payload(
                nueva_contrasena=self.CURRENT_PWD,
                confirmar_contrasena=self.CURRENT_PWD,
            ),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('nueva_contrasena', response.data)

    def test_contrasena_debil_devuelve_400(self):
        response = self.client.post(
            self.URL,
            self._payload(nueva_contrasena='123', confirmar_contrasena='123'),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('nueva_contrasena', response.data)

    def test_usuario_no_autenticado_devuelve_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(self.URL, self._payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
