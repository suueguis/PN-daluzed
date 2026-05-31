"""
Seed de datos visuales para validar el frontend completo (Planes 0–6).

Crea catálogo, inventario, recepciones, producción y alertas con datos
realistas de una empresa de repostería. Es idempotente: puede ejecutarse
varias veces sin duplicar registros.

Uso:
    python manage.py seed_visual_data
    python manage.py seed_visual_data --flush   # borra datos previos primero
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.alertas.models import Alerta
from apps.catalogo.models import (
    MateriaPrima,
    Presentacion,
    ProductoTerminado,
    Proveedor,
    UnidadMedida,
)
from apps.inventario.models import Bodega, Lote, MovimientoInventario
from apps.produccion.models import Batido, DetalleBatido, LoteProductoTerminado
from apps.recepcion.models import DetalleOrdenCompra, OrdenCompra, RecepcionMercancia

User = get_user_model()
today = date.today()


class Command(BaseCommand):
    help = "Crea datos de prueba visuales para todos los módulos del sistema."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Elimina datos previos antes de insertar (excepto usuarios).",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        with transaction.atomic():
            admin = self._get_admin()
            self._seed_catalogo()
            self._seed_bodegas()
            self._seed_lotes(admin)
            self._seed_traslados(admin)
            self._seed_ordenes(admin)
            self._seed_produccion(admin)
            self._seed_alertas()

        self.stdout.write(self.style.SUCCESS("✓ Seed de datos visuales completado."))

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _flush(self):
        self.stdout.write("  Limpiando datos previos…")
        Alerta.objects.all().delete()
        LoteProductoTerminado.objects.all().delete()
        DetalleBatido.objects.all().delete()
        Batido.objects.all().delete()
        RecepcionMercancia.objects.all().delete()
        DetalleOrdenCompra.objects.all().delete()
        OrdenCompra.objects.all().delete()
        MovimientoInventario.objects.all().delete()
        Lote.objects.all().delete()
        Bodega.objects.all().delete()
        Presentacion.objects.all().delete()
        ProductoTerminado.objects.all().delete()
        MateriaPrima.objects.all().delete()
        Proveedor.objects.all().delete()
        UnidadMedida.objects.all().delete()
        self.stdout.write("  Datos anteriores eliminados.")

    def _get_admin(self):
        return User.objects.filter(role="ADMIN").first() or User.objects.first()

    def _oc(self, model, **kwargs):
        obj, created = model.objects.get_or_create(**kwargs)
        return obj

    # ------------------------------------------------------------------
    # Catálogo
    # ------------------------------------------------------------------

    def _seed_catalogo(self):
        self.stdout.write("  Catálogo…")

        # Unidades de medida
        g   = self._oc(UnidadMedida, nombre="Gramos",      simbolo="g")
        kg  = self._oc(UnidadMedida, nombre="Kilogramos",  simbolo="kg")
        ml  = self._oc(UnidadMedida, nombre="Mililitros",  simbolo="ml")
        l   = self._oc(UnidadMedida, nombre="Litros",      simbolo="L")
        und = self._oc(UnidadMedida, nombre="Unidades",    simbolo="und")

        # Proveedores
        p1 = self._oc(Proveedor, nombre="Harinera del Valle S.A.",
                      defaults=dict(contacto="Juan Mesa", telefono="604-111-2222",
                                    email="ventas@harineradelvalle.com"))
        p2 = self._oc(Proveedor, nombre="Azucarera Nacional",
                      defaults=dict(contacto="María López", telefono="604-333-4444",
                                    email="pedidos@azucarera.com"))
        p3 = self._oc(Proveedor, nombre="Lácteos El Prado",
                      defaults=dict(contacto="Carlos Ríos", telefono="310-555-6666",
                                    email="distribución@lacteoelprado.com"))
        p4 = self._oc(Proveedor, nombre="Distribuidora El Sabor",
                      defaults=dict(contacto="Ana Torres", telefono="315-777-8888",
                                    email="info@elsabor.co"))
        p5 = self._oc(Proveedor, nombre="Empaques y Más",
                      defaults=dict(contacto="Pedro Ruiz", telefono="300-999-0000",
                                    email="contacto@empaquesymas.co"))

        # Materias primas
        harina = self._oc(MateriaPrima, nombre="Harina de trigo",
                          defaults=dict(unidad_medida=g, punto_reorden=5000,
                                        categoria="TORTA",
                                        condicion_almacenamiento="AMBIENTE"))
        azucar = self._oc(MateriaPrima, nombre="Azúcar blanca",
                          defaults=dict(unidad_medida=g, punto_reorden=3000,
                                        categoria="GALLETERIA",
                                        condicion_almacenamiento="AMBIENTE"))
        mantequilla = self._oc(MateriaPrima, nombre="Mantequilla sin sal",
                               defaults=dict(unidad_medida=g, punto_reorden=2000,
                                             dias_minimos_vencimiento=7,
                                             categoria="TORTA",
                                             condicion_almacenamiento="REFRIGERACION"))
        leche = self._oc(MateriaPrima, nombre="Leche entera",
                         defaults=dict(unidad_medida=ml, punto_reorden=2000,
                                       dias_minimos_vencimiento=3,
                                       categoria="BIZCOCHO",
                                       condicion_almacenamiento="REFRIGERACION"))
        huevos = self._oc(MateriaPrima, nombre="Huevos frescos",
                          defaults=dict(unidad_medida=und, punto_reorden=24,
                                        dias_minimos_vencimiento=5,
                                        categoria="GALLETERIA",
                                        condicion_almacenamiento="REFRIGERACION"))
        chocolate = self._oc(MateriaPrima, nombre="Chocolate negro 70%",
                             defaults=dict(unidad_medida=g, punto_reorden=1000,
                                           categoria="TORTA",
                                           condicion_almacenamiento="AMBIENTE"))
        vainilla = self._oc(MateriaPrima, nombre="Esencia de vainilla",
                            defaults=dict(unidad_medida=ml, punto_reorden=200,
                                          categoria="GENERAL",
                                          condicion_almacenamiento="AMBIENTE"))
        levadura = self._oc(MateriaPrima, nombre="Levadura en polvo",
                            defaults=dict(unidad_medida=g, punto_reorden=500,
                                          dias_minimos_vencimiento=30,
                                          categoria="BIZCOCHO",
                                          condicion_almacenamiento="AMBIENTE"))
        sal = self._oc(MateriaPrima, nombre="Sal refinada",
                       defaults=dict(unidad_medida=g, punto_reorden=500,
                                     categoria="GENERAL",
                                     condicion_almacenamiento="AMBIENTE"))
        crema = self._oc(MateriaPrima, nombre="Crema de leche",
                         defaults=dict(unidad_medida=ml, punto_reorden=1000,
                                       dias_minimos_vencimiento=5,
                                       categoria="TORTA",
                                       condicion_almacenamiento="REFRIGERACION"))
        cacao = self._oc(MateriaPrima, nombre="Cacao en polvo",
                         defaults=dict(unidad_medida=g, punto_reorden=800,
                                       categoria="TORTA",
                                       condicion_almacenamiento="AMBIENTE"))
        canela = self._oc(MateriaPrima, nombre="Canela en polvo",
                          defaults=dict(unidad_medida=g, punto_reorden=100,
                                        categoria="GALLETERIA",
                                        condicion_almacenamiento="AMBIENTE"))

        # Relación proveedor ↔ materia prima
        harina.proveedores.add(p1)
        azucar.proveedores.add(p2)
        mantequilla.proveedores.add(p3)
        leche.proveedores.add(p3)
        huevos.proveedores.add(p4)
        chocolate.proveedores.add(p4)
        vainilla.proveedores.add(p4)
        levadura.proveedores.add(p1, p2)
        crema.proveedores.add(p3)
        cacao.proveedores.add(p4)

        # Presentaciones
        def pres(mp, nombre, um, factor, costo=None):
            obj, _ = Presentacion.objects.get_or_create(
                materia_prima=mp, nombre=nombre,
                defaults=dict(unidad_medida=um, factor_conversion=factor, costo=costo),
            )
            return obj

        pres(harina, "Bulto 50 kg",    kg,  50000, 85000)
        pres(harina, "Bolsa 1 kg",     kg,   1000,  3200)
        pres(azucar, "Bulto 50 kg",    kg,  50000, 78000)
        pres(azucar, "Bolsa 2 kg",     kg,   2000,  4500)
        pres(mantequilla, "Bloque 1 kg", kg, 1000,  9500)
        pres(mantequilla, "Bloque 500 g", g,  500,  5200)
        pres(leche, "Caja 1 L",        l,   1000,  3800)
        pres(leche, "Bolsa 900 ml",    ml,   900,  3200)
        pres(huevos, "Cubeta 30 und",  und,   30,  18000)
        pres(huevos, "Cubeta 12 und",  und,   12,   8000)
        pres(chocolate, "Barra 1 kg",  kg,  1000,  32000)
        pres(vainilla, "Frasco 500 ml", ml,  500,  12000)
        pres(levadura, "Sobre 500 g",   g,   500,   4500)
        pres(crema, "Caja 1 L",        l,   1000,   8500)
        pres(cacao, "Bolsa 1 kg",      kg,  1000,  15000)

        # Productos terminados
        def pt(nombre, vida, um):
            obj, _ = ProductoTerminado.objects.get_or_create(
                nombre=nombre,
                defaults=dict(vida_util_dias=vida, unidad_medida=um),
            )
            return obj

        pt("Torta de chocolate",        5,  und)
        pt("Ponqué de vainilla",        4,  und)
        pt("Galletas de mantequilla",   7,  und)
        pt("Bizcocho de canela",        3,  und)
        pt("Torta tres leches",         3,  und)
        pt("Brownies de chocolate",     5,  und)
        pt("Cupcakes de vainilla",      4,  und)

        self.stdout.write("    ✓ Catálogo listo")
        return harina, azucar, mantequilla, leche, huevos, chocolate, vainilla, levadura, sal, crema, cacao, canela

    # ------------------------------------------------------------------
    # Bodegas
    # ------------------------------------------------------------------

    def _seed_bodegas(self):
        self.stdout.write("  Bodegas…")
        self._oc(Bodega, nombre="Bodega Principal",      defaults=dict(tipo="PRINCIPAL"))
        self._oc(Bodega, nombre="Punto de Producción 1", defaults=dict(tipo="PDP"))
        self._oc(Bodega, nombre="Punto de Producción 2", defaults=dict(tipo="PDP"))
        self.stdout.write("    ✓ Bodegas listas")

    # ------------------------------------------------------------------
    # Lotes
    # ------------------------------------------------------------------

    def _seed_lotes(self, usuario):
        self.stdout.write("  Lotes de inventario…")
        principal = Bodega.objects.get(nombre="Bodega Principal")
        pdp1      = Bodega.objects.get(nombre="Punto de Producción 1")

        mps = {mp.nombre: mp for mp in MateriaPrima.objects.all()}
        provs = {p.nombre: p for p in Proveedor.objects.all()}

        def lote(mp_nombre, bodega, cantidad, vence_en_dias, proveedor_nombre=None, num=""):
            mp   = mps[mp_nombre]
            prov = provs.get(proveedor_nombre)
            obj, _ = Lote.objects.get_or_create(
                materia_prima=mp,
                bodega=bodega,
                numero_lote=num or f"{mp.nombre[:3].upper()}-{vence_en_dias:+d}d",
                defaults=dict(
                    proveedor=prov,
                    cantidad=cantidad,
                    fecha_vencimiento=today + timedelta(days=vence_en_dias),
                    fecha_entrada=today - timedelta(days=max(0, -vence_en_dias + 30)),
                ),
            )
            return obj

        # Lotes normales (buen stock, vencimiento lejano)
        lote("Harina de trigo",     principal, 25000, 180, "Harinera del Valle S.A.", "HAR-001")
        lote("Harina de trigo",     pdp1,       8000, 160, "Harinera del Valle S.A.", "HAR-002")
        lote("Azúcar blanca",       principal, 18000, 365, "Azucarera Nacional",       "AZU-001")
        lote("Azúcar blanca",       pdp1,       4000, 340, "Azucarera Nacional",       "AZU-002")
        lote("Mantequilla sin sal", principal,  6000,  21, "Lácteos El Prado",         "MAN-001")
        lote("Leche entera",        principal,  5000,  10, "Lácteos El Prado",         "LEC-001")
        lote("Huevos frescos",      principal,   120,  14, "Distribuidora El Sabor",   "HUE-001")
        lote("Chocolate negro 70%", principal,  4000,  90, "Distribuidora El Sabor",   "CHO-001")
        lote("Esencia de vainilla", principal,   800, 365, "Distribuidora El Sabor",   "VAI-001")
        lote("Levadura en polvo",   principal,  2000, 120, "Harinera del Valle S.A.",  "LEV-001")
        lote("Sal refinada",        principal,  3000, 730, num="SAL-001")
        lote("Crema de leche",      principal,  3000,  12, "Lácteos El Prado",         "CRE-001")
        lote("Cacao en polvo",      principal,  2500, 180, "Distribuidora El Sabor",   "CAC-001")
        lote("Canela en polvo",     principal,   600, 365, num="CAN-001")

        # Lotes próximos a vencer (generan alerta de vencimiento)
        lote("Mantequilla sin sal", pdp1,       800,   4, "Lácteos El Prado",  "MAN-VENC")
        lote("Leche entera",        pdp1,      1200,   2, "Lácteos El Prado",  "LEC-VENC")
        lote("Crema de leche",      pdp1,       400,   3, "Lácteos El Prado",  "CRE-VENC")
        lote("Huevos frescos",      pdp1,        24,   4, "Distribuidora El Sabor", "HUE-VENC")

        # Lotes con stock bajo (generan alerta de reorden)
        lote("Esencia de vainilla", pdp1,   80, 200, "Distribuidora El Sabor", "VAI-BAJO")  # <200 punto reorden
        lote("Levadura en polvo",   pdp1,  150, 100, "Harinera del Valle S.A.", "LEV-BAJO")  # <500
        lote("Canela en polvo",     pdp1,   40, 300, num="CAN-BAJO")  # <100

        self.stdout.write("    ✓ Lotes listos")

    # ------------------------------------------------------------------
    # Traslados
    # ------------------------------------------------------------------

    def _seed_traslados(self, usuario):
        self.stdout.write("  Traslados…")
        principal = Bodega.objects.get(nombre="Bodega Principal")
        pdp1      = Bodega.objects.get(nombre="Punto de Producción 1")

        mps = {mp.nombre: mp for mp in MateriaPrima.objects.all()}

        def traslado(mp_nombre, cantidad, notas=""):
            mp = mps[mp_nombre]
            lote_obj = Lote.objects.filter(materia_prima=mp, bodega=principal).first()
            if not lote_obj:
                return
            if MovimientoInventario.objects.filter(
                tipo="TRASLADO", lote=lote_obj, bodega_destino=pdp1, cantidad=cantidad
            ).exists():
                return
            MovimientoInventario.objects.create(
                tipo="TRASLADO",
                lote=lote_obj,
                bodega_origen=principal,
                bodega_destino=pdp1,
                cantidad=cantidad,
                usuario=usuario,
                notas=notas,
            )

        traslado("Harina de trigo",     3000, "Reposición semanal PDP1")
        traslado("Azúcar blanca",       2000, "Reposición semanal PDP1")
        traslado("Chocolate negro 70%",  800, "Para producción de brownies")
        traslado("Cacao en polvo",       500, "Reposición PDP1")
        self.stdout.write("    ✓ Traslados listos")

    # ------------------------------------------------------------------
    # Órdenes de Compra y Recepciones
    # ------------------------------------------------------------------

    def _seed_ordenes(self, usuario):
        self.stdout.write("  Órdenes de compra y recepciones…")
        provs = {p.nombre: p for p in Proveedor.objects.all()}
        mps   = {mp.nombre: mp for mp in MateriaPrima.objects.all()}
        pres_qs = Presentacion.objects.select_related("materia_prima")

        def get_pres(mp_nombre, pres_nombre):
            return pres_qs.filter(materia_prima__nombre=mp_nombre, nombre=pres_nombre).first()

        # OC 1 – Harinera (RECIBIDA)
        oc1, created1 = OrdenCompra.objects.get_or_create(
            proveedor=provs["Harinera del Valle S.A."],
            fecha_creacion=today - timedelta(days=10),
            defaults=dict(estado="RECIBIDA", usuario_creador=usuario),
        )
        if created1:
            DetalleOrdenCompra.objects.create(
                orden=oc1,
                materia_prima=mps["Harina de trigo"],
                presentacion=get_pres("Harina de trigo", "Bulto 50 kg"),
                cantidad_presentacion=5,
            )
            DetalleOrdenCompra.objects.create(
                orden=oc1,
                materia_prima=mps["Levadura en polvo"],
                presentacion=get_pres("Levadura en polvo", "Sobre 500 g"),
                cantidad_presentacion=8,
            )
            RecepcionMercancia.objects.create(
                orden_compra=oc1,
                fecha=today - timedelta(days=9),
                usuario=usuario,
                confirmada=True,
            )

        # OC 2 – Lácteos (RECIBIDA)
        oc2, created2 = OrdenCompra.objects.get_or_create(
            proveedor=provs["Lácteos El Prado"],
            fecha_creacion=today - timedelta(days=7),
            defaults=dict(estado="RECIBIDA", usuario_creador=usuario),
        )
        if created2:
            DetalleOrdenCompra.objects.create(
                orden=oc2,
                materia_prima=mps["Leche entera"],
                presentacion=get_pres("Leche entera", "Caja 1 L"),
                cantidad_presentacion=20,
            )
            DetalleOrdenCompra.objects.create(
                orden=oc2,
                materia_prima=mps["Mantequilla sin sal"],
                presentacion=get_pres("Mantequilla sin sal", "Bloque 1 kg"),
                cantidad_presentacion=8,
            )
            DetalleOrdenCompra.objects.create(
                orden=oc2,
                materia_prima=mps["Crema de leche"],
                presentacion=get_pres("Crema de leche", "Caja 1 L"),
                cantidad_presentacion=6,
            )
            RecepcionMercancia.objects.create(
                orden_compra=oc2,
                fecha=today - timedelta(days=6),
                usuario=usuario,
                confirmada=True,
            )

        # OC 3 – El Sabor (RECIBIDA)
        oc3, created3 = OrdenCompra.objects.get_or_create(
            proveedor=provs["Distribuidora El Sabor"],
            fecha_creacion=today - timedelta(days=5),
            defaults=dict(estado="RECIBIDA", usuario_creador=usuario),
        )
        if created3:
            DetalleOrdenCompra.objects.create(
                orden=oc3,
                materia_prima=mps["Huevos frescos"],
                presentacion=get_pres("Huevos frescos", "Cubeta 30 und"),
                cantidad_presentacion=4,
            )
            DetalleOrdenCompra.objects.create(
                orden=oc3,
                materia_prima=mps["Chocolate negro 70%"],
                presentacion=get_pres("Chocolate negro 70%", "Barra 1 kg"),
                cantidad_presentacion=5,
            )
            RecepcionMercancia.objects.create(
                orden_compra=oc3,
                fecha=today - timedelta(days=4),
                usuario=usuario,
                confirmada=True,
            )

        # OC 4 – Azucarera (PENDIENTE — aún no recibida)
        oc4, _ = OrdenCompra.objects.get_or_create(
            proveedor=provs["Azucarera Nacional"],
            fecha_creacion=today - timedelta(days=2),
            defaults=dict(estado="PENDIENTE", usuario_creador=usuario),
        )
        if _:
            DetalleOrdenCompra.objects.create(
                orden=oc4,
                materia_prima=mps["Azúcar blanca"],
                presentacion=get_pres("Azúcar blanca", "Bulto 50 kg"),
                cantidad_presentacion=3,
            )

        # OC 5 – Harinera (PENDIENTE)
        oc5, _ = OrdenCompra.objects.get_or_create(
            proveedor=provs["Harinera del Valle S.A."],
            fecha_creacion=today,
            defaults=dict(estado="PENDIENTE", usuario_creador=usuario),
        )
        if _:
            DetalleOrdenCompra.objects.create(
                orden=oc5,
                materia_prima=mps["Harina de trigo"],
                presentacion=get_pres("Harina de trigo", "Bulto 50 kg"),
                cantidad_presentacion=4,
            )

        # OC 6 – Cancelada (histórico)
        oc6, created6 = OrdenCompra.objects.get_or_create(
            proveedor=provs["Distribuidora El Sabor"],
            fecha_creacion=today - timedelta(days=20),
            defaults=dict(estado="CANCELADA", usuario_creador=usuario),
        )
        if created6:
            DetalleOrdenCompra.objects.create(
                orden=oc6,
                materia_prima=mps["Esencia de vainilla"],
                presentacion=get_pres("Esencia de vainilla", "Frasco 500 ml"),
                cantidad_presentacion=2,
            )

        self.stdout.write("    ✓ Órdenes y recepciones listas")

    # ------------------------------------------------------------------
    # Producción
    # ------------------------------------------------------------------

    def _seed_produccion(self, usuario):
        self.stdout.write("  Producción…")
        mps = {mp.nombre: mp for mp in MateriaPrima.objects.all()}
        pts = {pt.nombre: pt for pt in ProductoTerminado.objects.all()}

        def primer_lote(mp_nombre):
            return Lote.objects.filter(materia_prima__nombre=mp_nombre).first()

        def batido(pt_nombre, fecha_delta, hora, estado, ingredientes, lotes_pt):
            pt = pts[pt_nombre]
            fecha_prod = today + timedelta(days=fecha_delta)
            b, created = Batido.objects.get_or_create(
                producto_terminado=pt,
                fecha_produccion=fecha_prod,
                hora_inicio=hora,
                defaults=dict(estado=estado, usuario=usuario),
            )
            if created:
                for mp_nombre, cantidad in ingredientes:
                    lote_obj = primer_lote(mp_nombre)
                    if lote_obj:
                        DetalleBatido.objects.create(
                            batido=b,
                            materia_prima=mps[mp_nombre],
                            lote=lote_obj,
                            cantidad=cantidad,
                        )
                for cant, vida, estado_lote in lotes_pt:
                    vence = fecha_prod + timedelta(days=vida)
                    LoteProductoTerminado.objects.create(
                        batido=b,
                        estado=estado_lote,
                        cantidad=cant,
                        fecha_produccion=fecha_prod,
                        fecha_vencimiento=vence,
                    )
            return b

        # Batidos completados (histórico)
        batido(
            "Torta de chocolate", -5, "08:00", "COMPLETADO",
            [("Harina de trigo", 800), ("Azúcar blanca", 600),
             ("Chocolate negro 70%", 400), ("Mantequilla sin sal", 300),
             ("Huevos frescos", 6), ("Leche entera", 300)],
            [(8, 5, "EN_PUNTO_DE_VENTA"), (2, 5, "EN_PUNTO_DE_VENTA")],
        )
        batido(
            "Galletas de mantequilla", -4, "09:00", "COMPLETADO",
            [("Harina de trigo", 500), ("Azúcar blanca", 350),
             ("Mantequilla sin sal", 400), ("Huevos frescos", 3),
             ("Esencia de vainilla", 10)],
            [(20, 7, "EN_PUNTO_DE_VENTA"), (5, 7, "EN_PUNTO_DE_VENTA")],
        )
        batido(
            "Ponqué de vainilla", -3, "07:30", "COMPLETADO",
            [("Harina de trigo", 700), ("Azúcar blanca", 500),
             ("Mantequilla sin sal", 350), ("Huevos frescos", 5),
             ("Esencia de vainilla", 15), ("Leche entera", 200)],
            [(6, 4, "EN_PUNTO_DE_VENTA"), (2, 4, "EN_PUNTO_DE_VENTA")],
        )
        batido(
            "Brownies de chocolate", -2, "08:30", "COMPLETADO",
            [("Harina de trigo", 400), ("Azúcar blanca", 450),
             ("Chocolate negro 70%", 350), ("Mantequilla sin sal", 250),
             ("Huevos frescos", 4), ("Cacao en polvo", 80)],
            [(12, 5, "EN_PUNTO_DE_VENTA"), (3, 5, "EN_PUNTO_DE_VENTA")],
        )

        # Batidos en proceso (hoy)
        batido(
            "Bizcocho de canela", 0, "07:00", "EN_PROCESO",
            [("Harina de trigo", 600), ("Azúcar blanca", 400),
             ("Mantequilla sin sal", 200), ("Huevos frescos", 4),
             ("Leche entera", 250), ("Canela en polvo", 20),
             ("Levadura en polvo", 15)],
            [(8, 3, "EN_ESPERA")],
        )
        batido(
            "Torta tres leches", 0, "10:00", "EN_PROCESO",
            [("Harina de trigo", 900), ("Azúcar blanca", 700),
             ("Huevos frescos", 8), ("Leche entera", 500),
             ("Crema de leche", 400), ("Esencia de vainilla", 20)],
            [(5, 3, "EN_ESPERA")],
        )

        # Batido futuro programado
        batido(
            "Cupcakes de vainilla", 1, "09:00", "EN_PROCESO",
            [("Harina de trigo", 300), ("Azúcar blanca", 280),
             ("Mantequilla sin sal", 180), ("Huevos frescos", 3),
             ("Esencia de vainilla", 12), ("Leche entera", 120)],
            [(24, 4, "EN_ESPERA")],
        )

        # Lote de producto terminado vencido/próximo a vencer (alerta producción)
        pt_choc = pts.get("Torta de chocolate")
        if pt_choc:
            b_old, created_old = Batido.objects.get_or_create(
                producto_terminado=pt_choc,
                fecha_produccion=today - timedelta(days=10),
                hora_inicio="06:00",
                defaults=dict(estado="COMPLETADO", usuario=usuario),
            )
            if created_old:
                lote_obj = primer_lote("Harina de trigo")
                if lote_obj:
                    DetalleBatido.objects.create(
                        batido=b_old,
                        materia_prima=mps["Harina de trigo"],
                        lote=lote_obj,
                        cantidad=800,
                    )
                # Este lote ya venció → alerta producción-vencida
                LoteProductoTerminado.objects.get_or_create(
                    batido=b_old,
                    estado="EN_ESPERA",
                    defaults=dict(
                        cantidad=3,
                        fecha_produccion=today - timedelta(days=10),
                        fecha_vencimiento=today - timedelta(days=5),
                    ),
                )

        self.stdout.write("    ✓ Producción lista")

    # ------------------------------------------------------------------
    # Alertas
    # ------------------------------------------------------------------

    def _seed_alertas(self):
        self.stdout.write("  Alertas…")
        mps    = {mp.nombre: mp for mp in MateriaPrima.objects.all()}
        bodegas = {b.nombre: b for b in Bodega.objects.all()}

        def alerta(tipo, mp_nombre=None, bodega_nombre=None, lote_qs_filter=None, mensaje=""):
            mp     = mps.get(mp_nombre) if mp_nombre else None
            bodega = bodegas.get(bodega_nombre) if bodega_nombre else None
            lote   = None
            if lote_qs_filter and mp:
                lote = Lote.objects.filter(materia_prima=mp, **lote_qs_filter).first()
            Alerta.objects.get_or_create(
                tipo=tipo,
                materia_prima=mp,
                bodega=bodega,
                lote=lote,
                activa=True,
                defaults=dict(mensaje=mensaje),
            )

        # Stock bajo
        alerta("STOCK_BAJO", "Esencia de vainilla", "Punto de Producción 1",
               mensaje="Stock de Esencia de vainilla en PDP1 por debajo del punto de reorden (80 g < 200 g).")
        alerta("STOCK_BAJO", "Levadura en polvo", "Punto de Producción 1",
               mensaje="Stock de Levadura en polvo en PDP1 por debajo del punto de reorden (150 g < 500 g).")
        alerta("STOCK_BAJO", "Canela en polvo", "Punto de Producción 1",
               mensaje="Stock de Canela en polvo en PDP1 por debajo del punto de reorden (40 g < 100 g).")

        # Vencimiento próximo
        alerta("VENCIMIENTO_PROXIMO", "Leche entera", "Punto de Producción 1",
               lote_qs_filter={"numero_lote": "LEC-VENC"},
               mensaje="Lote LEC-VENC de Leche entera vence en 2 días.")
        alerta("VENCIMIENTO_PROXIMO", "Crema de leche", "Punto de Producción 1",
               lote_qs_filter={"numero_lote": "CRE-VENC"},
               mensaje="Lote CRE-VENC de Crema de leche vence en 3 días.")
        alerta("VENCIMIENTO_PROXIMO", "Mantequilla sin sal", "Punto de Producción 1",
               lote_qs_filter={"numero_lote": "MAN-VENC"},
               mensaje="Lote MAN-VENC de Mantequilla sin sal vence en 4 días.")
        alerta("VENCIMIENTO_PROXIMO", "Huevos frescos", "Punto de Producción 1",
               lote_qs_filter={"numero_lote": "HUE-VENC"},
               mensaje="Lote HUE-VENC de Huevos frescos vence en 4 días.")

        # Producción en espera (lote vencido sin despachar)
        alerta("EN_ESPERA_PENDIENTE", "Torta de chocolate",
               mensaje="Lote de Torta de chocolate lleva 5 días en estado EN_ESPERA sin despacharse y ya venció.")

        self.stdout.write("    ✓ Alertas listas")
