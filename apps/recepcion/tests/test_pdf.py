# apps/recepcion/tests/test_pdf.py

from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from datetime import date, timedelta

from apps.catalogo.models import UnidadMedida, MateriaPrima, Presentacion, Proveedor
from apps.inventario.models import Bodega
from apps.recepcion.models import OrdenCompra, DetalleOrdenCompra, RecepcionMercancia

User = get_user_model()


class RecepcionPDFViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='inv@daluzed.com', password='Pass2026!', role='INVENTARIO'
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(RefreshToken.for_user(self.user).access_token)}')

        um = UnidadMedida.objects.create(nombre='kg', simbolo='kg')
        prov = Proveedor.objects.create(nombre='Distrib. Andina', telefono='3001234567')
        mp = MateriaPrima.objects.create(nombre='Harina', unidad_medida=um, punto_reorden=100)
        pres = Presentacion.objects.create(nombre='Bulto', materia_prima=mp, unidad_medida=um, factor_conversion=50)
        Bodega.objects.create(nombre='Principal', tipo='PRINCIPAL')

        self.oc = OrdenCompra.objects.create(proveedor=prov, usuario_creador=self.user)
        DetalleOrdenCompra.objects.create(orden=self.oc, materia_prima=mp, presentacion=pres, cantidad_presentacion=2)
        self.rec = RecepcionMercancia.objects.create(
            orden_compra=self.oc, usuario=self.user, confirmada=True
        )

    def _url(self, pk=None):
        pk = pk or self.rec.pk
        return f'/api/v1/recepcion/{pk}/pdf/'

    def test_pdf_requiere_autenticacion(self):
        self.client.credentials()
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_pdf_devuelve_content_type_pdf(self):
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp['Content-Type'], 'application/pdf')

    def test_pdf_content_disposition_con_id(self):
        resp = self.client.get(self._url())
        self.assertIn(f'REC-{self.rec.pk}.pdf', resp['Content-Disposition'])

    def test_pdf_cuerpo_no_vacio(self):
        resp = self.client.get(self._url())
        self.assertGreater(len(resp.content), 0)

    def test_pdf_404_para_recepcion_inexistente(self):
        resp = self.client.get(self._url(pk=99999))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
