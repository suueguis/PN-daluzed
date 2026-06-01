# apps/produccion/tests/test_produccion.py

from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db import transaction, IntegrityError
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date, timedelta
from unittest.mock import patch

from apps.catalogo.models import UnidadMedida, MateriaPrima, ProductoTerminado
from apps.inventario.models import Bodega, Lote
from apps.produccion.models import (
    Batido,
    DetalleBatido,
    LoteProductoTerminado,
    MovimientoCompensatorio,
)

User = get_user_model()

URL_BATIDOS    = '/api/v1/produccion/batidos/'
URL_DESPACHOS  = '/api/v1/produccion/despachos/'
URL_COMP       = '/api/v1/produccion/compensatorios/'


class BatidoTestCase(APITestCase):
    """PROD-001 al PROD-008 y PROD-012-014: Registro de batidos y producción."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='produccion@daluzed.com',
            password='Daluzed2026!',
            role='PRODUCCION',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        # Catálogo
        self.gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.unidades = UnidadMedida.objects.create(nombre='Unidades', simbolo='und')

        self.mp_harina = MateriaPrima.objects.create(
            nombre='Harina', unidad_medida=self.gramos, punto_reorden=5000
        )
        self.mp_azucar = MateriaPrima.objects.create(
            nombre='Azúcar', unidad_medida=self.gramos, punto_reorden=3000
        )
        self.torta_vainilla = ProductoTerminado.objects.create(
            nombre='Torta de vainilla', vida_util_dias=14, unidad_medida=self.unidades
        )
        # Bodegas
        self.bodega_pdp = Bodega.objects.create(nombre='Bodega PDP', tipo='PDP')
        # Lotes disponibles en PDP
        hoy = date.today()
        self.lote_harina_nuevo = Lote.objects.create(
            materia_prima=self.mp_harina,
            bodega=self.bodega_pdp,
            cantidad=20000,
            fecha_vencimiento=hoy + timedelta(days=60),
            fecha_entrada=hoy,
        )
        self.lote_harina_proximo = Lote.objects.create(
            materia_prima=self.mp_harina,
            bodega=self.bodega_pdp,
            cantidad=5000,
            fecha_vencimiento=hoy + timedelta(days=15),  # vence más pronto
            fecha_entrada=hoy - timedelta(days=2),
        )
        self.lote_azucar = Lote.objects.create(
            materia_prima=self.mp_azucar,
            bodega=self.bodega_pdp,
            cantidad=10000,
            fecha_vencimiento=hoy + timedelta(days=90),
            fecha_entrada=hoy,
        )

    def _payload_batido_valido(self):
        """Payload base para un batido válido."""
        return {
            'producto_terminado_id': self.torta_vainilla.id,
            'fecha_produccion': str(date.today()),
            'hora_inicio': '08:00',
            'ingredientes': [
                {
                    'materia_prima_id': self.mp_harina.id,
                    'lote_id': self.lote_harina_proximo.id,
                    'cantidad': 3000,
                },
                {
                    'materia_prima_id': self.mp_azucar.id,
                    'lote_id': self.lote_azucar.id,
                    'cantidad': 1500,
                },
            ],
        }

    # ── PROD-001 ──────────────────────────────────────────────────────
    def test_prod_001_registrar_batido_descuenta_mp_de_bodega_pdp(self):
        """
        Al confirmar un batido, las cantidades de los ingredientes
        se descuentan de los lotes de Bodega PDP.
        RF-PROD-01, RF-PROD-02
        """
        # Arrange
        cantidad_harina_antes = float(self.lote_harina_proximo.cantidad)
        payload = self._payload_batido_valido()
        # Act
        response = self.client.post(URL_BATIDOS, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.lote_harina_proximo.refresh_from_db()
        self.assertEqual(
            float(self.lote_harina_proximo.cantidad),
            cantidad_harina_antes - 3000,
        )

    # ── PROD-002 ──────────────────────────────────────────────────────
    def test_prod_002_sugerencia_fefo_para_ingredientes(self):
        """
        El endpoint de sugerencia FEFO devuelve el lote con
        vencimiento más próximo para cada ingrediente.
        RF-PROD-02
        """
        # Act
        response = self.client.get(
            '/api/v1/produccion/sugerencia-fefo/',
            {'producto_terminado_id': self.torta_vainilla.id},
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Para harina, debe sugerir el lote que vence más pronto
        harina_sugerencia = next(
            (s for s in response.data['sugerencias']
             if s['materia_prima_id'] == self.mp_harina.id),
            None,
        )
        self.assertIsNotNone(harina_sugerencia)
        self.assertEqual(
            harina_sugerencia['lote_id'], self.lote_harina_proximo.id
        )

    # ── PROD-003 ──────────────────────────────────────────────────────
    def test_prod_003_stock_insuficiente_devuelve_nombre_y_cantidad_faltante(self):
        """
        Si un ingrediente no tiene stock suficiente en PDP, el error
        debe incluir nombre de la materia prima y cantidad exacta faltante.
        RF-PROD-03
        """
        # Arrange — pedir más harina de la disponible
        payload = self._payload_batido_valido()
        payload['ingredientes'][0]['cantidad'] = 99999  # mucho más que 5000 disponibles

        # Act
        response = self.client.post(URL_BATIDOS, payload, format='json')

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_str = str(response.data)
        self.assertIn('Harina', error_str)
        self.assertIn('faltante', error_str.lower())

    # ── PROD-004 ──────────────────────────────────────────────────────
    def test_prod_004_maximo_dos_batidos_simultaneos(self):
        """
        No se pueden tener más de 2 batidos con estado EN_PROCESO al mismo tiempo.
        El tercer intento debe devolver HTTP 400.
        RF-PROD-04
        """
        # Arrange — crear 2 batidos en estado EN_PROCESO
        for i in range(2):
            Batido.objects.create(
                producto_terminado=self.torta_vainilla,
                fecha_produccion=date.today(),
                hora_inicio='08:00',
                estado='EN_PROCESO',
                usuario=self.user,
            )
        # Act — intentar crear el tercero
        payload = self._payload_batido_valido()
        response = self.client.post(URL_BATIDOS, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('2', str(response.data))

    # ── PROD-005 ──────────────────────────────────────────────────────
    def test_prod_005_batido_crea_lote_en_espera_con_vencimiento_correcto(self):
        """
        Al completar un batido, se crea un LoteProductoTerminado
        en estado EN_ESPERA cuya fecha de vencimiento es
        fecha_produccion + vida_util_dias del producto.
        RF-PROD-05
        """
        # Arrange
        fecha_prod = date.today()
        payload = self._payload_batido_valido()
        payload['fecha_produccion'] = str(fecha_prod)
        # Act
        response = self.client.post(URL_BATIDOS, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        batido_id = response.data['id']
        lote_pt = LoteProductoTerminado.objects.filter(
            batido_id=batido_id
        ).first()
        self.assertIsNotNone(lote_pt)
        self.assertEqual(lote_pt.estado, 'EN_ESPERA')
        vencimiento_esperado = fecha_prod + timedelta(
            days=self.torta_vainilla.vida_util_dias
        )
        self.assertEqual(lote_pt.fecha_vencimiento, vencimiento_esperado)

    # ── PROD-006 ──────────────────────────────────────────────────────
    def test_prod_006_despacho_cambia_estado_a_en_punto_de_venta(self):
        """
        POST /produccion/despachos/{id}/ cambia el estado del
        LoteProductoTerminado de EN_ESPERA a EN_PUNTO_DE_VENTA.
        RF-PROD-06
        """
        # Arrange
        batido = Batido.objects.create(
            producto_terminado=self.torta_vainilla,
            fecha_produccion=date.today() - timedelta(days=1),
            hora_inicio='07:00',
            estado='COMPLETADO',
            usuario=self.user,
        )
        lote_pt = LoteProductoTerminado.objects.create(
            batido=batido,
            estado='EN_ESPERA',
            fecha_vencimiento=date.today() + timedelta(days=13),
            fecha_produccion=date.today() - timedelta(days=1),
            cantidad=20,
        )
        # Act
        response = self.client.post(
            f'{URL_DESPACHOS}{lote_pt.id}/despachar/'
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lote_pt.refresh_from_db()
        self.assertEqual(lote_pt.estado, 'EN_PUNTO_DE_VENTA')

    # ── PROD-007 ──────────────────────────────────────────────────────
    def test_prod_007_fifo_despacha_lote_mas_antiguo_primero(self):
        """
        La sugerencia FIFO para despacho devuelve el lote producido
        con fecha más antigua (primer lote producido = primero en salir).
        RF-PROD-06
        """
        # Arrange — crear dos lotes en EN_ESPERA con fechas distintas
        batido_viejo = Batido.objects.create(
            producto_terminado=self.torta_vainilla,
            fecha_produccion=date.today() - timedelta(days=2),
            hora_inicio='07:00',
            estado='COMPLETADO',
            usuario=self.user,
        )
        lote_viejo = LoteProductoTerminado.objects.create(
            batido=batido_viejo,
            estado='EN_ESPERA',
            fecha_vencimiento=date.today() + timedelta(days=12),
            fecha_produccion=date.today() - timedelta(days=2),
            cantidad=15,
        )
        batido_nuevo = Batido.objects.create(
            producto_terminado=self.torta_vainilla,
            fecha_produccion=date.today() - timedelta(days=1),
            hora_inicio='08:00',
            estado='COMPLETADO',
            usuario=self.user,
        )
        LoteProductoTerminado.objects.create(
            batido=batido_nuevo,
            estado='EN_ESPERA',
            fecha_vencimiento=date.today() + timedelta(days=13),
            fecha_produccion=date.today() - timedelta(days=1),
            cantidad=20,
        )
        # Act
        response = self.client.get(
            '/api/v1/produccion/sugerencia-fifo/',
            {'producto_terminado_id': self.torta_vainilla.id},
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['lote_sugerido']['id'], lote_viejo.id)

    # ── PROD-008 ──────────────────────────────────────────────────────
    def test_prod_008_despacho_es_irreversible(self):
        """
        Un lote EN_PUNTO_DE_VENTA no puede volver a EN_ESPERA.
        El intento debe devolver HTTP 400.
        RF-PROD-07
        """
        # Arrange
        batido = Batido.objects.create(
            producto_terminado=self.torta_vainilla,
            fecha_produccion=date.today(),
            hora_inicio='09:00',
            estado='COMPLETADO',
            usuario=self.user,
        )
        lote_pt = LoteProductoTerminado.objects.create(
            batido=batido,
            estado='EN_PUNTO_DE_VENTA',
            fecha_vencimiento=date.today() + timedelta(days=13),
            fecha_produccion=date.today(),
            fecha_despacho=date.today(),
            cantidad=10,
        )
        # Act — intentar revertir el estado
        response = self.client.patch(
            f'{URL_DESPACHOS}{lote_pt.id}/',
            {'estado': 'EN_ESPERA'},
            format='json',
        )
        # Assert
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN,
             status.HTTP_405_METHOD_NOT_ALLOWED],
        )
        lote_pt.refresh_from_db()
        self.assertEqual(lote_pt.estado, 'EN_PUNTO_DE_VENTA')


class MovimientoCompensatorioTestCase(APITestCase):
    """PROD-009 al PROD-011: Corrección de registros mediante movimiento compensatorio."""

    def setUp(self):
        self.user_inventario = User.objects.create_user(
            email='inventario@daluzed.com',
            password='Daluzed2026!',
            role='INVENTARIO',
        )
        self.user_gerente = User.objects.create_user(
            email='gerente@daluzed.com',
            password='Daluzed2026!',
            role='GERENTE',
        )
        self.user_produccion = User.objects.create_user(
            email='produccion@daluzed.com',
            password='Daluzed2026!',
            role='PRODUCCION',
        )
        # Autenticar como produccion (tiene acceso de escritura en producción)
        refresh = RefreshToken.for_user(self.user_produccion)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
        )
        gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.mp = MateriaPrima.objects.create(
            nombre='Azúcar', unidad_medida=gramos, punto_reorden=2000
        )
        bodega_pdp = Bodega.objects.create(nombre='Bodega PDP', tipo='PDP')
        self.lote = Lote.objects.create(
            materia_prima=self.mp,
            bodega=bodega_pdp,
            cantidad=10000,
            fecha_vencimiento=date.today() + timedelta(days=90),
            fecha_entrada=date.today(),
        )

    # ── PROD-009 ──────────────────────────────────────────────────────
    def test_prod_009_compensatorio_ajusta_inventario_atomicamente(self):
        """
        POST /produccion/compensatorios/ registra un ajuste
        y actualiza el inventario de forma atómica.
        RF-PROD-08
        """
        # Arrange
        payload = {
            'tipo_afectado': 'Lote',
            'id_afectado': self.lote.id,
            'datos_originales': {'cantidad': 10000},
            'datos_corregidos': {'cantidad': 9500},
            'descripcion': 'Error en conteo. Cantidad real: 9500g.',
        }
        # Act
        response = self.client.post(URL_COMP, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.lote.refresh_from_db()
        self.assertEqual(float(self.lote.cantidad), 9500.0)

    # ── PROD-010 ──────────────────────────────────────────────────────
    def test_prod_010_compensatorio_visible_para_todos_los_roles(self):
        """
        GET /produccion/compensatorios/ es accesible por todos los
        roles autenticados: INVENTARIO, GERENTE, PRODUCCION, ADMIN.
        RF-PROD-08
        """
        # Arrange — crear un compensatorio existente
        MovimientoCompensatorio.objects.create(
            tipo_afectado='Lote',
            id_afectado=self.lote.id,
            descripcion='Ajuste de prueba',
            usuario=self.user_inventario,
            datos_originales={'cantidad': 10000},
            datos_corregidos={'cantidad': 9500},
        )
        roles_y_usuarios = [
            self.user_gerente,
            self.user_produccion,
        ]
        for usuario in roles_y_usuarios:
            # Act — cada rol consulta el endpoint
            refresh = RefreshToken.for_user(usuario)
            self.client.credentials(
                HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}'
            )
            response = self.client.get(URL_COMP)
            # Assert — todos deben ver los compensatorios
            self.assertEqual(
                response.status_code, status.HTTP_200_OK,
                msg=f'Falló para el rol {usuario.role}',
            )

    # ── PROD-011 ──────────────────────────────────────────────────────
    def test_prod_011_compensatorio_registra_datos_completos(self):
        """
        El movimiento compensatorio almacena: dato original, dato corregido,
        usuario que lo registra y fecha-hora (auto_now_add).
        RF-PROD-08
        """
        # Arrange
        payload = {
            'tipo_afectado': 'Lote',
            'id_afectado': self.lote.id,
            'datos_originales': {'cantidad': 10000},
            'datos_corregidos': {'cantidad': 8000},
            'descripcion': 'Se contabilizaron 2000g que ya habían sido consumidos.',
        }
        # Act
        response = self.client.post(URL_COMP, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        comp = MovimientoCompensatorio.objects.order_by('-id').first()
        self.assertEqual(comp.datos_originales['cantidad'], 10000)
        self.assertEqual(comp.datos_corregidos['cantidad'], 8000)
        self.assertEqual(comp.usuario, self.user_produccion)
        self.assertIsNotNone(comp.fecha)
        self.assertIn(
            'consumidos', comp.descripcion.lower()
        )

    # ── PROD-012 ──────────────────────────────────────────────────────
    def test_prod_012_fecha_vencimiento_lote_pt_es_produccion_mas_vida_util(self):
        """
        Verificar fórmula: fecha_vencimiento = fecha_produccion + vida_util_dias.
        RF-PROD-05
        """
        # Arrange
        unidades = UnidadMedida.objects.create(nombre='Und2', simbolo='u2')
        producto = ProductoTerminado.objects.create(
            nombre='Bizcocho', vida_util_dias=5, unidad_medida=unidades
        )
        fecha_prod = date(2026, 6, 1)
        # Act
        fecha_vencimiento_calculada = fecha_prod + timedelta(days=producto.vida_util_dias)
        # Assert
        self.assertEqual(fecha_vencimiento_calculada, date(2026, 6, 6))

    # ── PROD-013 ──────────────────────────────────────────────────────
    def test_prod_013_multiples_batidos_mismo_dia_agrupados_en_jornada(self):
        """
        Varios batidos con la misma fecha_produccion pertenecen a
        la misma jornada y el endpoint de jornadas los devuelve agrupados.
        RF-PROD-01
        """
        # Arrange
        unidades = UnidadMedida.objects.create(nombre='Und3', simbolo='u3')
        pt = ProductoTerminado.objects.create(
            nombre='Torta test', vida_util_dias=14, unidad_medida=unidades
        )
        hoy = date.today()
        for i in range(3):
            Batido.objects.create(
                producto_terminado=pt,
                fecha_produccion=hoy,
                hora_inicio=f'0{7+i}:00',
                estado='COMPLETADO',
                usuario=self.user_inventario,
            )
        # Act
        response = self.client.get(
            '/api/v1/produccion/jornadas/',
            {'fecha': str(hoy)},
        )
        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(
            response.data['total_batidos'], 3
        )

    # ── PROD-014 ──────────────────────────────────────────────────────
    def test_prod_014_transaccion_atomica_revierte_si_falla_a_mitad(self):
        """
        Si el descuento de ingredientes falla en la mitad del proceso
        (ej: segundo ingrediente sin stock), ningún lote ni descuento
        debe quedar parcialmente aplicado.
        RF-PROD-01
        """
        # Arrange — azúcar con stock insuficiente
        self.lote_azucar_pdp = Lote.objects.create(
            materia_prima=self.mp,
            bodega=Bodega.objects.get(tipo='PDP'),
            cantidad=100,  # muy poco
            fecha_vencimiento=date.today() + timedelta(days=90),
            fecha_entrada=date.today(),
        )
        gramos = UnidadMedida.objects.get(simbolo='g')
        mp_harina = MateriaPrima.objects.create(
            nombre='Harina2', unidad_medida=gramos, punto_reorden=1000
        )
        lote_harina_pdp = Lote.objects.create(
            materia_prima=mp_harina,
            bodega=Bodega.objects.get(tipo='PDP'),
            cantidad=5000,
            fecha_vencimiento=date.today() + timedelta(days=60),
            fecha_entrada=date.today(),
        )
        unidades = UnidadMedida.objects.create(nombre='Und4', simbolo='u4')
        pt = ProductoTerminado.objects.create(
            nombre='Torta atomica', vida_util_dias=14, unidad_medida=unidades
        )
        payload = {
            'producto_terminado_id': pt.id,
            'fecha_produccion': str(date.today()),
            'hora_inicio': '10:00',
            'ingredientes': [
                {
                    'materia_prima_id': mp_harina.id,
                    'lote_id': lote_harina_pdp.id,
                    'cantidad': 1000,  # OK — hay 5000
                },
                {
                    'materia_prima_id': self.mp.id,
                    'lote_id': self.lote_azucar_pdp.id,
                    'cantidad': 5000,  # FALLA — solo hay 100
                },
            ],
        }
        cantidad_harina_antes = float(lote_harina_pdp.cantidad)
        # Act
        response = self.client.post(URL_BATIDOS, payload, format='json')
        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # La harina NO debe haberse descontado (transacción se revirtió)
        lote_harina_pdp.refresh_from_db()
        self.assertEqual(float(lote_harina_pdp.cantidad), cantidad_harina_antes)
