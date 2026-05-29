# apps/alertas/tests/test_alertas.py

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch, MagicMock
from datetime import date, timedelta

from apps.catalogo.models import UnidadMedida, MateriaPrima
from apps.inventario.models import Bodega, Lote
from apps.alertas.models import Alerta
from apps.alertas.services import AlertaService  # servicio de negocio a implementar

User = get_user_model()


class AlertasTestCase(TestCase):
    """
    ALR-001 al ALR-008: Generación, deduplicación y envío de alertas.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.mp = MateriaPrima.objects.create(
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

    # ── ALR-001 ───────────────────────────────────────────────────────
    def test_alr_001_stock_bodega_principal_bajo_reorden_genera_alerta(self):
        """
        Cuando el stock de Bodega Principal cae al punto de reorden
        (o por debajo), AlertaService genera una alerta STOCK_BAJO.
        RF-ALR-01
        """
        # Arrange — stock exactamente en el punto de reorden
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=9000,  # por debajo de punto_reorden=10000
            fecha_vencimiento=date.today() + timedelta(days=60),
            fecha_entrada=date.today(),
        )
        # Act
        AlertaService.verificar_stock_reorden(self.mp)
        # Assert
        alerta = Alerta.objects.filter(
            tipo='STOCK_BAJO',
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            activa=True,
        ).first()
        self.assertIsNotNone(alerta)

    # ── ALR-002 ───────────────────────────────────────────────────────
    def test_alr_002_stock_bodega_pdp_bajo_reorden_no_genera_alerta(self):
        """
        Cuando el stock de Bodega PDP cae por debajo del punto de reorden,
        NO se debe generar ninguna alerta (PDP queda excluida).
        RF-ALR-01, RF-INV-02
        """
        # Arrange — solo hay stock bajo en PDP, BP tiene suficiente
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_pdp,
            cantidad=500,  # muy bajo, pero PDP no activa alertas
            fecha_vencimiento=date.today() + timedelta(days=60),
            fecha_entrada=date.today(),
        )
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=50000,  # suficiente en BP
            fecha_vencimiento=date.today() + timedelta(days=60),
            fecha_entrada=date.today(),
        )
        # Act
        AlertaService.verificar_stock_reorden(self.mp)
        # Assert — no debe haberse creado ninguna alerta de stock bajo
        alertas_pdp = Alerta.objects.filter(
            tipo='STOCK_BAJO',
            bodega=self.bodega_pdp,
        )
        self.assertEqual(alertas_pdp.count(), 0)

    # ── ALR-003 ───────────────────────────────────────────────────────
    def test_alr_003_lote_con_vencimiento_proximo_genera_alerta(self):
        """
        Cuando un lote tiene fecha_vencimiento dentro de los
        próximos N días (configurado), se genera alerta VENCIMIENTO_PROXIMO.
        RF-ALR-02
        """
        # Arrange — lote que vence en 5 días
        lote = Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=1000,
            fecha_vencimiento=date.today() + timedelta(days=5),
            fecha_entrada=date.today() - timedelta(days=25),
        )
        # Act
        AlertaService.verificar_vencimientos(dias_umbral=7)
        # Assert
        alerta = Alerta.objects.filter(
            tipo='VENCIMIENTO_PROXIMO',
            materia_prima=self.mp,
            activa=True,
        ).first()
        self.assertIsNotNone(alerta)

    # ── ALR-004 ───────────────────────────────────────────────────────
    def test_alr_004_lote_en_espera_pendiente_mas_de_x_horas_genera_alerta(self):
        """
        Si un LoteProductoTerminado lleva más de X horas en estado
        EN_ESPERA sin ser despachado, se genera alerta EN_ESPERA_PENDIENTE.
        RF-ALR-03
        """
        # Arrange
        from datetime import datetime, timedelta as td
        from apps.produccion.models import Batido, LoteProductoTerminado
        from apps.catalogo.models import ProductoTerminado
        unidades = UnidadMedida.objects.create(nombre='Und5', simbolo='u5')
        pt = ProductoTerminado.objects.create(
            nombre='Torta alerta', vida_util_dias=14, unidad_medida=unidades
        )
        batido = Batido.objects.create(
            producto_terminado=pt,
            fecha_produccion=date.today() - timedelta(days=2),
            hora_inicio='07:00',
            estado='COMPLETADO',
            usuario=self.user,
        )
        lote_pt = LoteProductoTerminado.objects.create(
            batido=batido,
            estado='EN_ESPERA',
            fecha_vencimiento=date.today() + timedelta(days=12),
            fecha_produccion=date.today() - timedelta(days=2),
            cantidad=10,
        )
        # Act — verificar lotes con más de 24 horas en EN_ESPERA
        AlertaService.verificar_lotes_en_espera(horas_umbral=24)
        # Assert
        alerta = Alerta.objects.filter(
            tipo='EN_ESPERA_PENDIENTE',
            activa=True,
        ).first()
        self.assertIsNotNone(alerta)

    # ── ALR-005 ───────────────────────────────────────────────────────
    def test_alr_005_alerta_resuelta_no_se_duplica_hasta_nueva_condicion(self):
        """
        Si una alerta de stock bajo fue resuelta, no se vuelve a crear
        hasta que el stock vuelve a caer (deduplicación).
        RF-ALR-04
        """
        # Arrange — alerta ya resuelta
        from django.utils import timezone
        Alerta.objects.create(
            tipo='STOCK_BAJO',
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            activa=False,  # ya resuelta
            fecha_resolucion=timezone.now(),
            mensaje='Stock bajo resuelto.',
        )
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=15000,  # ahora hay suficiente stock
            fecha_vencimiento=date.today() + timedelta(days=60),
            fecha_entrada=date.today(),
        )
        # Act — volver a verificar con stock OK
        AlertaService.verificar_stock_reorden(self.mp)
        # Assert — no debe haberse creado una nueva alerta activa
        alertas_activas = Alerta.objects.filter(
            tipo='STOCK_BAJO',
            materia_prima=self.mp,
            activa=True,
        )
        self.assertEqual(alertas_activas.count(), 0)

    # ── ALR-006 ───────────────────────────────────────────────────────
    @patch('apps.alertas.services.channel_layer')
    def test_alr_006_alerta_enviada_por_websocket(self, mock_channel_layer):
        """
        Al generar una alerta, AlertaService llama a channel_layer.group_send
        para enviarla por WebSocket a los usuarios conectados.
        RF-ALR-05
        """
        # Arrange
        mock_channel_layer.group_send = MagicMock()
        Lote.objects.create(
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            cantidad=500,  # bajo el punto de reorden
            fecha_vencimiento=date.today() + timedelta(days=60),
            fecha_entrada=date.today(),
        )
        # Act
        AlertaService.verificar_stock_reorden(self.mp, enviar_ws=True)
        # Assert
        mock_channel_layer.group_send.assert_called_once()
        args = mock_channel_layer.group_send.call_args
        self.assertIn('alertas', args[0][0])  # grupo 'alertas'

    # ── ALR-007 ───────────────────────────────────────────────────────
    @patch('apps.alertas.services.twilio_client')
    def test_alr_007_alerta_enviada_por_whatsapp_mock_twilio(
        self, mock_twilio
    ):
        """
        Al generar una alerta crítica, AlertaService envía un mensaje
        de WhatsApp via Twilio. Se verifica con mock.
        RF-ALR-02
        """
        # Arrange
        mock_twilio.messages.create = MagicMock(
            return_value=MagicMock(sid='SM_TEST_12345')
        )
        alerta = Alerta.objects.create(
            tipo='STOCK_BAJO',
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            activa=True,
            mensaje='Stock crítico de Harina de trigo.',
        )
        # Act
        AlertaService.enviar_whatsapp(alerta)
        # Assert
        mock_twilio.messages.create.assert_called_once()
        kwargs = mock_twilio.messages.create.call_args[1]
        self.assertTrue(kwargs['to'].startswith('whatsapp:'))
        self.assertIn('Harina', kwargs['body'])

    # ── ALR-008 ───────────────────────────────────────────────────────
    @patch('apps.alertas.services.send_mail')
    def test_alr_008_alerta_enviada_por_email_mock_smtp(self, mock_send_mail):
        """
        Al generar una alerta, AlertaService envía un email de notificación.
        Se verifica con mock de django.core.mail.send_mail.
        RF-ALR-02
        """
        # Arrange
        mock_send_mail.return_value = 1
        alerta = Alerta.objects.create(
            tipo='VENCIMIENTO_PROXIMO',
            materia_prima=self.mp,
            bodega=self.bodega_principal,
            activa=True,
            mensaje='Lote de Harina vence en 5 días.',
        )
        # Act
        AlertaService.enviar_email(alerta, destinatario='gerencia@daluzed.com')
        # Assert
        mock_send_mail.assert_called_once()
        args = mock_send_mail.call_args
        self.assertIn('Harina', args[0][0])  # asunto
        self.assertIn('gerencia@daluzed.com', args[0][3])  # destinatario
