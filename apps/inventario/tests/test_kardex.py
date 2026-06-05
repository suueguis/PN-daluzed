# apps/inventario/tests/test_kardex.py

from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from datetime import date, timedelta

from apps.catalogo.models import UnidadMedida, MateriaPrima
from apps.inventario.models import Bodega, Lote, MovimientoInventario

User = get_user_model()
KARDEX_URL = '/api/v1/inventario/kardex/'


class KardexViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='inventario@daluzed.com', password='Daluzed2026!', role='INVENTARIO'
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(RefreshToken.for_user(self.user).access_token)}')

        gramos = UnidadMedida.objects.create(nombre='Gramos', simbolo='g')
        self.mp = MateriaPrima.objects.create(nombre='Azúcar', unidad_medida=gramos, punto_reorden=1000)
        self.bp = Bodega.objects.create(nombre='BP', tipo='PRINCIPAL')
        self.lote = Lote.objects.create(
            materia_prima=self.mp, bodega=self.bp,
            cantidad=500, fecha_vencimiento=date.today() + timedelta(days=90),
            fecha_entrada=date.today(),
        )
        self.mov1 = MovimientoInventario.objects.create(
            tipo='RECEPCION', lote=self.lote, bodega_destino=self.bp,
            cantidad=500, usuario=self.user,
        )
        self.mov2 = MovimientoInventario.objects.create(
            tipo='CONSUMO', lote=self.lote, bodega_origen=self.bp,
            cantidad=200, usuario=self.user,
        )

    # INV-K-01
    def test_kardex_requiere_materia_prima(self):
        resp = self.client.get(KARDEX_URL)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # INV-K-02
    def test_kardex_devuelve_movimientos_con_saldo(self):
        resp = self.client.get(KARDEX_URL, {'materia_prima': self.mp.id})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rows = resp.data
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['tipo'], 'RECEPCION')
        self.assertEqual(float(rows[0]['saldo']), 500.0)
        self.assertEqual(rows[1]['tipo'], 'CONSUMO')
        self.assertEqual(float(rows[1]['saldo']), 300.0)

    # INV-K-03
    def test_kardex_inventario_puede_acceder(self):
        resp = self.client.get(KARDEX_URL, {'materia_prima': self.mp.id})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    # INV-K-04
    def test_kardex_sin_autenticar_devuelve_401(self):
        self.client.credentials()
        resp = self.client.get(KARDEX_URL, {'materia_prima': self.mp.id})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    # INV-K-05
    def test_kardex_mp_inexistente_devuelve_404(self):
        resp = self.client.get(KARDEX_URL, {'materia_prima': 99999})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # INV-K-06
    def test_kardex_filtra_por_tipo(self):
        resp = self.client.get(KARDEX_URL, {'materia_prima': self.mp.id, 'tipo': 'RECEPCION'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rows = resp.data
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['tipo'], 'RECEPCION')

    # INV-K-07
    def test_kardex_traslado_no_afecta_saldo(self):
        pdp = Bodega.objects.create(nombre='PDP', tipo='PRODUCCION')
        MovimientoInventario.objects.create(
            tipo='TRASLADO', lote=self.lote,
            bodega_origen=self.bp, bodega_destino=pdp,
            cantidad=100, usuario=self.user,
        )
        resp = self.client.get(KARDEX_URL, {'materia_prima': self.mp.id})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rows = resp.data
        # last row is TRASLADO; saldo should remain same as previous (300)
        traslado_row = next(r for r in rows if r['tipo'] == 'TRASLADO')
        self.assertEqual(float(traslado_row['saldo']), 300.0)

    # INV-K-08
    def test_kardex_filtra_por_rango_fechas(self):
        future = (date.today() + timedelta(days=5)).isoformat()
        resp = self.client.get(KARDEX_URL, {
            'materia_prima': self.mp.id,
            'desde': future,
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 0)
