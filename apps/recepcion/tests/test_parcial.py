# apps/recepcion/tests/test_parcial.py

from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from datetime import date, timedelta

from apps.catalogo.models import UnidadMedida, MateriaPrima, Presentacion, Proveedor
from apps.inventario.models import Bodega
from apps.recepcion.models import OrdenCompra, DetalleOrdenCompra, RecepcionMercancia

User = get_user_model()
URL_REC = '/api/v1/recepcion/'
URL_OC  = '/api/v1/recepcion/ordenes/'


class RecepcionParcialTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='inv@daluzed.com', password='Pass2026!', role='INVENTARIO'
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(RefreshToken.for_user(self.user).access_token)}')

        um = UnidadMedida.objects.create(nombre='kg', simbolo='kg')
        self.prov = Proveedor.objects.create(nombre='Distrib. Andina', telefono='3001234567')
        self.mp = MateriaPrima.objects.create(nombre='Harina', unidad_medida=um, punto_reorden=100)
        self.pres = Presentacion.objects.create(
            nombre='Bulto 50kg', materia_prima=self.mp, unidad_medida=um, factor_conversion=50
        )
        Bodega.objects.create(nombre='Principal', tipo='PRINCIPAL')

        self.oc = OrdenCompra.objects.create(proveedor=self.prov, usuario_creador=self.user)
        self.detalle = DetalleOrdenCompra.objects.create(
            orden=self.oc, materia_prima=self.mp, presentacion=self.pres, cantidad_presentacion=10
        )

    def _payload(self, cantidad):
        return {
            'orden_compra_id': self.oc.id,
            'detalles': [{
                'materia_prima_id': self.mp.id,
                'presentacion_id':  self.pres.id,
                'cantidad_presentacion': cantidad,
                'fecha_vencimiento': str(date.today() + timedelta(days=180)),
            }],
        }

    def test_primera_recepcion_parcial_cambia_estado_a_parcial(self):
        resp = self.client.post(URL_REC, self._payload(5), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.oc.refresh_from_db()
        self.assertEqual(self.oc.estado, 'PARCIAL')

    def test_cantidad_recibida_se_actualiza(self):
        self.client.post(URL_REC, self._payload(5), format='json')
        self.detalle.refresh_from_db()
        self.assertEqual(float(self.detalle.cantidad_recibida), 5.0)

    def test_segunda_recepcion_contra_oc_parcial_permitida(self):
        self.client.post(URL_REC, self._payload(5), format='json')
        self.oc.refresh_from_db()
        self.assertEqual(self.oc.estado, 'PARCIAL')
        resp2 = self.client.post(URL_REC, self._payload(5), format='json')
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)

    def test_recepcion_completa_cambia_estado_a_recibida(self):
        self.client.post(URL_REC, self._payload(5), format='json')
        self.client.post(URL_REC, self._payload(5), format='json')
        self.oc.refresh_from_db()
        self.assertEqual(self.oc.estado, 'RECIBIDA')

    def test_oc_estado_parcial_aparece_en_lista(self):
        self.client.post(URL_REC, self._payload(5), format='json')
        resp = self.client.get(URL_OC, {'estado': 'PARCIAL'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [o['id'] for o in resp.data]
        self.assertIn(self.oc.id, ids)

    def test_oc_serializer_incluye_saldo_pendiente(self):
        self.client.post(URL_REC, self._payload(3), format='json')
        resp = self.client.get(f'{URL_OC}{self.oc.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        detalle = resp.data['detalles'][0]
        self.assertEqual(float(detalle['saldo_pendiente']), 7.0)
