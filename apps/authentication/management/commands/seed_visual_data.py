"""
Seed de datos visuales para validar el frontend completo.

Crea catálogo, inventario, recepciones, producción, alertas, auditoría
y configuración con datos realistas de una empresa de repostería.
Es idempotente: puede ejecutarse varias veces sin duplicar registros.

Uso:
    python manage.py seed_visual_data
    python manage.py seed_visual_data --flush   # borra datos previos primero
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.alertas.models import Alerta, ConfiguracionAlerta
from apps.auditoria.models import BitacoraOperacion
from apps.catalogo.models import (
    MateriaPrima,
    Presentacion,
    ProductoTerminado,
    Proveedor,
    UnidadMedida,
)
from apps.inventario.models import Bodega, ZonaBodega, Lote, MovimientoInventario
from apps.produccion.models import (
    Batido, DetalleBatido, LoteProductoTerminado, MovimientoCompensatorio,
)
from apps.recepcion.models import DetalleOrdenCompra, OrdenCompra, RecepcionMercancia

User = get_user_model()
today = date.today()

BODEGA_PRINCIPAL  = "Bodega Principal"
BODEGA_PLANTA     = "Bodega de Planta de Producción"
BODEGA_PRODUCCION = "Planta de Producción"


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
            users  = self._get_users()
            admin  = users["admin"]

            self._seed_catalogo()
            self._seed_bodegas()
            self._seed_zonas()
            self._seed_lotes(admin)
            self._seed_movimientos(admin)
            self._seed_ordenes(admin)
            self._seed_produccion(admin)
            self._seed_compensatorios(admin)
            self._seed_alertas()
            self._seed_configuracion_alerta()
            self._seed_bitacora(users)

        self.stdout.write(self.style.SUCCESS("✓ Seed de datos visuales completado."))

    # ──────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────

    def _flush(self):
        self.stdout.write("  Limpiando datos previos…")
        BitacoraOperacion.objects.all().delete()
        ConfiguracionAlerta.objects.all().delete()
        Alerta.objects.all().delete()
        MovimientoCompensatorio.objects.all().delete()
        LoteProductoTerminado.objects.all().delete()
        DetalleBatido.objects.all().delete()
        Batido.objects.all().delete()
        RecepcionMercancia.objects.all().delete()
        DetalleOrdenCompra.objects.all().delete()
        OrdenCompra.objects.all().delete()
        MovimientoInventario.objects.all().delete()
        Lote.objects.all().delete()
        ZonaBodega.objects.all().delete()
        Bodega.objects.all().delete()
        Presentacion.objects.all().delete()
        ProductoTerminado.objects.all().delete()
        MateriaPrima.objects.all().delete()
        Proveedor.objects.all().delete()
        UnidadMedida.objects.all().delete()
        self.stdout.write("  Datos anteriores eliminados.")

    def _get_users(self):
        admin      = User.objects.filter(role="ADMIN").first()      or User.objects.first()
        gerente    = User.objects.filter(role="GERENTE").first()    or admin
        produccion = User.objects.filter(role="PRODUCCION").first() or admin
        inventario = User.objects.filter(role="INVENTARIO").first() or admin
        return {"admin": admin, "gerente": gerente,
                "produccion": produccion, "inventario": inventario}

    def _oc(self, model, **kwargs):
        obj, _ = model.objects.get_or_create(**kwargs)
        return obj

    # ──────────────────────────────────────────────────────────────────
    # Catálogo
    # ──────────────────────────────────────────────────────────────────

    def _seed_catalogo(self):
        self.stdout.write("  Catálogo…")

        g   = self._oc(UnidadMedida, nombre="Gramos",     simbolo="g")
        kg  = self._oc(UnidadMedida, nombre="Kilogramos", simbolo="kg")
        ml  = self._oc(UnidadMedida, nombre="Mililitros", simbolo="ml")
        l   = self._oc(UnidadMedida, nombre="Litros",     simbolo="L")
        und = self._oc(UnidadMedida, nombre="Unidades",   simbolo="und")

        # Proveedores activos
        p1 = self._oc(Proveedor, nombre="Harinera del Valle S.A.",
                      defaults=dict(contacto="Juan Mesa", telefono="604-111-2222",
                                    email="ventas@harineradelvalle.com", activo=True))
        p2 = self._oc(Proveedor, nombre="Azucarera Nacional",
                      defaults=dict(contacto="María López", telefono="604-333-4444",
                                    email="pedidos@azucarera.com", activo=True))
        p3 = self._oc(Proveedor, nombre="Lácteos El Prado",
                      defaults=dict(contacto="Carlos Ríos", telefono="310-555-6666",
                                    email="distribucion@lacteoelprado.com", activo=True))
        p4 = self._oc(Proveedor, nombre="Distribuidora El Sabor",
                      defaults=dict(contacto="Ana Torres", telefono="315-777-8888",
                                    email="info@elsabor.co", activo=True))
        p5 = self._oc(Proveedor, nombre="Empaques y Más",
                      defaults=dict(contacto="Pedro Ruiz", telefono="300-999-0000",
                                    email="contacto@empaquesymas.co", activo=True))
        p6 = self._oc(Proveedor, nombre="Colorantes Andinos",
                      defaults=dict(contacto="Luz Marina Pérez", telefono="312-444-5555",
                                    email="ventas@colorantesandinos.co", activo=True))
        p7 = self._oc(Proveedor, nombre="Congelados Premium S.A.S.",
                      defaults=dict(contacto="Rodrigo Salazar", telefono="305-222-3333",
                                    email="pedidos@congeladospremium.com", activo=True))
        # Proveedor inactivo (histórico)
        self._oc(Proveedor, nombre="Distribuidora Antigua Ltda.",
                 defaults=dict(contacto="N/A", telefono="604-000-0001",
                               email="contacto@antigua.co", activo=False))

        # Materias primas
        harina      = self._oc(MateriaPrima, nombre="Harina de trigo",
                               defaults=dict(unidad_medida=g,  punto_reorden=5000,
                                             categoria="TORTA",     condicion_almacenamiento="AMBIENTE"))
        azucar      = self._oc(MateriaPrima, nombre="Azúcar blanca",
                               defaults=dict(unidad_medida=g,  punto_reorden=3000,
                                             categoria="GALLETERIA", condicion_almacenamiento="AMBIENTE"))
        mantequilla = self._oc(MateriaPrima, nombre="Mantequilla sin sal",
                               defaults=dict(unidad_medida=g,  punto_reorden=2000,
                                             dias_minimos_vencimiento=7,
                                             categoria="TORTA",     condicion_almacenamiento="REFRIGERACION"))
        leche       = self._oc(MateriaPrima, nombre="Leche entera",
                               defaults=dict(unidad_medida=ml, punto_reorden=2000,
                                             dias_minimos_vencimiento=3,
                                             categoria="BIZCOCHO",  condicion_almacenamiento="REFRIGERACION"))
        huevos      = self._oc(MateriaPrima, nombre="Huevos frescos",
                               defaults=dict(unidad_medida=und, punto_reorden=24,
                                             dias_minimos_vencimiento=5,
                                             categoria="GALLETERIA", condicion_almacenamiento="REFRIGERACION"))
        chocolate   = self._oc(MateriaPrima, nombre="Chocolate negro 70%",
                               defaults=dict(unidad_medida=g,  punto_reorden=1000,
                                             categoria="TORTA",     condicion_almacenamiento="AMBIENTE"))
        vainilla    = self._oc(MateriaPrima, nombre="Esencia de vainilla",
                               defaults=dict(unidad_medida=ml, punto_reorden=200,
                                             categoria="GENERAL",   condicion_almacenamiento="AMBIENTE"))
        levadura    = self._oc(MateriaPrima, nombre="Levadura en polvo",
                               defaults=dict(unidad_medida=g,  punto_reorden=500,
                                             dias_minimos_vencimiento=30,
                                             categoria="BIZCOCHO",  condicion_almacenamiento="AMBIENTE"))
        sal         = self._oc(MateriaPrima, nombre="Sal refinada",
                               defaults=dict(unidad_medida=g,  punto_reorden=500,
                                             categoria="GENERAL",   condicion_almacenamiento="AMBIENTE"))
        crema       = self._oc(MateriaPrima, nombre="Crema de leche",
                               defaults=dict(unidad_medida=ml, punto_reorden=1000,
                                             dias_minimos_vencimiento=5,
                                             categoria="TORTA",     condicion_almacenamiento="REFRIGERACION"))
        cacao       = self._oc(MateriaPrima, nombre="Cacao en polvo",
                               defaults=dict(unidad_medida=g,  punto_reorden=800,
                                             categoria="TORTA",     condicion_almacenamiento="AMBIENTE"))
        canela      = self._oc(MateriaPrima, nombre="Canela en polvo",
                               defaults=dict(unidad_medida=g,  punto_reorden=100,
                                             categoria="GALLETERIA", condicion_almacenamiento="AMBIENTE"))
        glucosa     = self._oc(MateriaPrima, nombre="Glucosa líquida",
                               defaults=dict(unidad_medida=ml, punto_reorden=500,
                                             categoria="GENERAL",   condicion_almacenamiento="AMBIENTE"))
        colorante_r = self._oc(MateriaPrima, nombre="Colorante rojo",
                               defaults=dict(unidad_medida=ml, punto_reorden=50,
                                             categoria="GALLETERIA", condicion_almacenamiento="AMBIENTE"))
        colorante_a = self._oc(MateriaPrima, nombre="Colorante amarillo",
                               defaults=dict(unidad_medida=ml, punto_reorden=50,
                                             categoria="GALLETERIA", condicion_almacenamiento="AMBIENTE"))
        gelatina    = self._oc(MateriaPrima, nombre="Gelatina sin sabor",
                               defaults=dict(unidad_medida=g,  punto_reorden=200,
                                             dias_minimos_vencimiento=365,
                                             categoria="TORTA",     condicion_almacenamiento="AMBIENTE"))
        bicarbonato = self._oc(MateriaPrima, nombre="Bicarbonato de sodio",
                               defaults=dict(unidad_medida=g,  punto_reorden=200,
                                             categoria="BIZCOCHO",  condicion_almacenamiento="AMBIENTE"))
        pulpa_fresa = self._oc(MateriaPrima, nombre="Pulpa de fresa",
                               defaults=dict(unidad_medida=g,  punto_reorden=2000,
                                             dias_minimos_vencimiento=90,
                                             categoria="TORTA",     condicion_almacenamiento="CONGELADO"))
        pulpa_mar   = self._oc(MateriaPrima, nombre="Pulpa de maracuyá",
                               defaults=dict(unidad_medida=g,  punto_reorden=2000,
                                             dias_minimos_vencimiento=90,
                                             categoria="TORTA",     condicion_almacenamiento="CONGELADO"))
        manteca     = self._oc(MateriaPrima, nombre="Manteca vegetal",
                               defaults=dict(unidad_medida=g,  punto_reorden=1000,
                                             categoria="GALLETERIA", condicion_almacenamiento="AMBIENTE"))
        # MP inactiva (retirada del catálogo)
        self._oc(MateriaPrima, nombre="Margarina industrial (descontinuada)",
                 defaults=dict(unidad_medida=g, punto_reorden=0,
                               categoria="GENERAL", condicion_almacenamiento="AMBIENTE", activo=False))

        # Relaciones proveedor ↔ materia prima
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
        glucosa.proveedores.add(p2)
        colorante_r.proveedores.add(p6)
        colorante_a.proveedores.add(p6)
        gelatina.proveedores.add(p4)
        bicarbonato.proveedores.add(p1)
        pulpa_fresa.proveedores.add(p7)
        pulpa_mar.proveedores.add(p7)
        manteca.proveedores.add(p1)

        # Presentaciones
        def pres(mp, nombre, um, factor, costo=None):
            obj, _ = Presentacion.objects.get_or_create(
                materia_prima=mp, nombre=nombre,
                defaults=dict(unidad_medida=um, factor_conversion=factor, costo=costo),
            )
            return obj

        pres(harina,      "Bulto 50 kg",         kg,  50000,  85000)
        pres(harina,      "Bolsa 1 kg",           kg,   1000,   3200)
        pres(azucar,      "Bulto 50 kg",          kg,  50000,  78000)
        pres(azucar,      "Bolsa 2 kg",           kg,   2000,   4500)
        pres(mantequilla, "Bloque 1 kg",          kg,   1000,   9500)
        pres(mantequilla, "Bloque 500 g",          g,    500,   5200)
        pres(leche,       "Caja 1 L",              l,   1000,   3800)
        pres(leche,       "Bolsa 900 ml",         ml,    900,   3200)
        pres(huevos,      "Cubeta 30 und",        und,    30,  18000)
        pres(huevos,      "Cubeta 12 und",        und,    12,   8000)
        pres(chocolate,   "Barra 1 kg",           kg,   1000,  32000)
        pres(vainilla,    "Frasco 500 ml",        ml,    500,  12000)
        pres(levadura,    "Sobre 500 g",           g,    500,   4500)
        pres(crema,       "Caja 1 L",              l,   1000,   8500)
        pres(cacao,       "Bolsa 1 kg",           kg,   1000,  15000)
        pres(canela,      "Sobre 100 g",           g,    100,   3500)
        pres(glucosa,     "Frasco 1 L",            l,   1000,   6500)
        pres(colorante_r, "Frasco 100 ml",        ml,    100,   4200)
        pres(colorante_a, "Frasco 100 ml",        ml,    100,   4200)
        pres(gelatina,    "Sobre 250 g",           g,    250,   3800)
        pres(bicarbonato, "Bolsa 500 g",           g,    500,   2800)
        pres(pulpa_fresa, "Bolsa 1 kg",            g,   1000,  12000)
        pres(pulpa_mar,   "Bolsa 1 kg",            g,   1000,  11000)
        pres(manteca,     "Bloque 1 kg",          kg,   1000,   7500)

        # Productos terminados
        def pt(nombre, vida, um):
            obj, _ = ProductoTerminado.objects.get_or_create(
                nombre=nombre,
                defaults=dict(vida_util_dias=vida, unidad_medida=um),
            )
            return obj

        pt("Torta de chocolate",      5, und)
        pt("Ponqué de vainilla",      4, und)
        pt("Galletas de mantequilla", 7, und)
        pt("Bizcocho de canela",      3, und)
        pt("Torta tres leches",       3, und)
        pt("Brownies de chocolate",   5, und)
        pt("Cupcakes de vainilla",    4, und)
        pt("Torta de fresa",          3, und)
        pt("Galletas de chocolate",   7, und)
        pt("Torta de maracuyá",       3, und)
        pt("Milhojas",                2, und)

        self.stdout.write("    ✓ Catálogo listo")

    # ──────────────────────────────────────────────────────────────────
    # Bodegas
    # ──────────────────────────────────────────────────────────────────

    def _seed_bodegas(self):
        self.stdout.write("  Bodegas…")
        self._oc(Bodega, nombre=BODEGA_PRINCIPAL,  defaults={"tipo": "PRINCIPAL"})
        self._oc(Bodega, nombre=BODEGA_PLANTA,     defaults={"tipo": "PDP"})
        self._oc(Bodega, nombre=BODEGA_PRODUCCION, defaults={"tipo": "PDP"})
        self.stdout.write("    ✓ Bodegas listas")

    # ──────────────────────────────────────────────────────────────────
    # ZonaBodega
    # ──────────────────────────────────────────────────────────────────

    def _seed_zonas(self):
        self.stdout.write("  Zonas de bodega…")
        principal = Bodega.objects.get(nombre=BODEGA_PRINCIPAL)
        planta    = Bodega.objects.get(nombre=BODEGA_PLANTA)
        prod      = Bodega.objects.get(nombre=BODEGA_PRODUCCION)

        def zona(bodega, nombre, desc, capacidad):
            obj, _ = ZonaBodega.objects.get_or_create(
                bodega=bodega, nombre=nombre,
                defaults=dict(descripcion=desc, capacidad_maxima=capacidad),
            )
            return obj

        zona(principal, "Zona A — Secos",        "Harinas, azúcares, sal y especias",    200000)
        zona(principal, "Zona B — Refrigerados", "Lácteos, huevos y mantequilla",         50000)
        zona(principal, "Zona C — Chocolates",   "Chocolate, cacao, glucosa y esencias",  40000)
        zona(principal, "Zona D — Congelados",   "Pulpas de fruta congeladas",            20000)

        zona(planta, "Estación 1 — Secos",        "Insumos secos de uso diario",  30000)
        zona(planta, "Estación 2 — Refrigerados", "Lácteos y huevos del día",     10000)
        zona(planta, "Estación 3 — Mesa",         "Artículos en uso activo",       5000)

        zona(prod, "Área Batidos",   "Zona de mezcla y batido",    10000)
        zona(prod, "Área Horneado",  "Zona de hornos",              5000)
        zona(prod, "Área Despacho",  "Zona de empaque y despacho",  8000)

        self.stdout.write("    ✓ Zonas listas")

    # ──────────────────────────────────────────────────────────────────
    # Lotes
    # ──────────────────────────────────────────────────────────────────

    def _seed_lotes(self, usuario):
        self.stdout.write("  Lotes de inventario…")
        principal = Bodega.objects.get(nombre=BODEGA_PRINCIPAL)
        planta    = Bodega.objects.get(nombre=BODEGA_PLANTA)
        prod      = Bodega.objects.get(nombre=BODEGA_PRODUCCION)

        z_secos  = ZonaBodega.objects.filter(bodega=principal, nombre__icontains="Secos").first()
        z_refrig = ZonaBodega.objects.filter(bodega=principal, nombre__icontains="Refrigerados").first()
        z_choc   = ZonaBodega.objects.filter(bodega=principal, nombre__icontains="Chocolates").first()
        z_cong   = ZonaBodega.objects.filter(bodega=principal, nombre__icontains="Congelados").first()
        z_est1   = ZonaBodega.objects.filter(bodega=planta, nombre__icontains="Estación 1").first()
        z_est2   = ZonaBodega.objects.filter(bodega=planta, nombre__icontains="Estación 2").first()

        mps   = {mp.nombre: mp for mp in MateriaPrima.objects.all()}
        provs = {p.nombre: p  for p  in Proveedor.objects.all()}

        def lote(mp_nombre, bodega, cantidad, vence_en_dias,
                 prov_nombre=None, num="", zona=None):
            mp   = mps[mp_nombre]
            prov = provs.get(prov_nombre)
            obj, _ = Lote.objects.get_or_create(
                materia_prima=mp, bodega=bodega,
                numero_lote=num or f"{mp.nombre[:3].upper()}-{vence_en_dias:+d}d",
                defaults=dict(
                    proveedor=prov, zona=zona, cantidad=cantidad,
                    fecha_vencimiento=today + timedelta(days=vence_en_dias),
                    fecha_entrada=today - timedelta(days=max(0, 30 - vence_en_dias // 6)),
                ),
            )
            return obj

        # ── Bodega Principal ──────────────────────────────────────────
        lote("Harina de trigo",     principal, 25000, 180, "Harinera del Valle S.A.", "HAR-001", z_secos)
        lote("Harina de trigo",     principal,  8000, 160, "Harinera del Valle S.A.", "HAR-002", z_secos)
        lote("Azúcar blanca",       principal, 18000, 365, "Azucarera Nacional",      "AZU-001", z_secos)
        lote("Azúcar blanca",       principal,  4500, 340, "Azucarera Nacional",      "AZU-002", z_secos)
        lote("Sal refinada",        principal,  3000, 730, num="SAL-001",             zona=z_secos)
        lote("Bicarbonato de sodio",principal,  1500, 730, num="BIC-001",             zona=z_secos)
        lote("Canela en polvo",     principal,   600, 365, num="CAN-001",             zona=z_secos)
        lote("Levadura en polvo",   principal,  2000, 120, "Harinera del Valle S.A.", "LEV-001", z_secos)
        lote("Manteca vegetal",     principal,  5000, 270, "Harinera del Valle S.A.", "MTC-001", z_secos)

        lote("Mantequilla sin sal", principal,  6000,  21, "Lácteos El Prado",       "MAN-001", z_refrig)
        lote("Leche entera",        principal,  5000,  10, "Lácteos El Prado",       "LEC-001", z_refrig)
        lote("Huevos frescos",      principal,   120,  14, "Distribuidora El Sabor", "HUE-001", z_refrig)
        lote("Crema de leche",      principal,  3000,  12, "Lácteos El Prado",       "CRE-001", z_refrig)

        lote("Chocolate negro 70%", principal,  4000,  90, "Distribuidora El Sabor", "CHO-001", z_choc)
        lote("Cacao en polvo",      principal,  2500, 180, "Distribuidora El Sabor", "CAC-001", z_choc)
        lote("Esencia de vainilla", principal,   800, 365, "Distribuidora El Sabor", "VAI-001", z_choc)
        lote("Glucosa líquida",     principal,  2000, 365, "Azucarera Nacional",     "GLU-001", z_choc)
        lote("Gelatina sin sabor",  principal,   800, 500, "Distribuidora El Sabor", "GEL-001", z_choc)
        lote("Colorante rojo",      principal,   150, 730, "Colorantes Andinos",     "CLR-001", z_choc)
        lote("Colorante amarillo",  principal,   150, 730, "Colorantes Andinos",     "CLA-001", z_choc)

        lote("Pulpa de fresa",    principal, 10000, 270, "Congelados Premium S.A.S.", "PUF-001", z_cong)
        lote("Pulpa de maracuyá", principal,  8000, 270, "Congelados Premium S.A.S.", "PUM-001", z_cong)

        # ── Bodega Planta — insumos de trabajo diario ─────────────────
        lote("Harina de trigo",     planta, 8000, 160, "Harinera del Valle S.A.", "HAR-P01", z_est1)
        lote("Azúcar blanca",       planta, 4000, 340, "Azucarera Nacional",      "AZU-P01", z_est1)
        lote("Cacao en polvo",      planta,  500, 180, "Distribuidora El Sabor",  "CAC-P01", z_est1)
        lote("Levadura en polvo",   planta,  150, 100, "Harinera del Valle S.A.", "LEV-BAJO", z_est1)  # stock bajo
        lote("Canela en polvo",     planta,   40, 300, num="CAN-BAJO",             zona=z_est1)        # stock bajo
        lote("Esencia de vainilla", planta,   80, 200, "Distribuidora El Sabor",  "VAI-BAJO", z_est1)  # stock bajo

        lote("Mantequilla sin sal", planta,  800,   4, "Lácteos El Prado",       "MAN-VENC", z_est2)  # vence pronto
        lote("Leche entera",        planta, 1200,   2, "Lácteos El Prado",       "LEC-VENC", z_est2)  # vence pronto
        lote("Crema de leche",      planta,  400,   3, "Lácteos El Prado",       "CRE-VENC", z_est2)  # vence pronto
        lote("Huevos frescos",      planta,   24,   4, "Distribuidora El Sabor", "HUE-VENC", z_est2)  # vence pronto

        # ── Planta de Producción — en uso activo ──────────────────────
        lote("Harina de trigo",     prod, 2000, 160, "Harinera del Valle S.A.", "HAR-PR1")
        lote("Azúcar blanca",       prod, 1500, 340, "Azucarera Nacional",      "AZU-PR1")
        lote("Chocolate negro 70%", prod,  800,  90, "Distribuidora El Sabor",  "CHO-PR1")

        self.stdout.write("    ✓ Lotes listos")

    # ──────────────────────────────────────────────────────────────────
    # Movimientos (traslados, devoluciones, descartes)
    # ──────────────────────────────────────────────────────────────────

    def _seed_movimientos(self, usuario):
        self.stdout.write("  Movimientos de inventario…")
        principal = Bodega.objects.get(nombre=BODEGA_PRINCIPAL)
        planta    = Bodega.objects.get(nombre=BODEGA_PLANTA)
        prod      = Bodega.objects.get(nombre=BODEGA_PRODUCCION)
        mps       = {mp.nombre: mp for mp in MateriaPrima.objects.all()}

        def _mov(tipo, mp_nombre, cantidad, origen, destino, notas=""):
            mp       = mps[mp_nombre]
            lote_obj = Lote.objects.filter(materia_prima=mp, bodega=origen).first()
            if not lote_obj:
                return
            if MovimientoInventario.objects.filter(
                tipo=tipo, lote=lote_obj, bodega_destino=destino, cantidad=cantidad
            ).exists():
                return
            MovimientoInventario.objects.create(
                tipo=tipo, lote=lote_obj,
                bodega_origen=origen, bodega_destino=destino,
                cantidad=cantidad, usuario=usuario, notas=notas,
            )

        def _mov_salida(tipo, mp_nombre, bodega, cantidad, notas=""):
            mp       = mps[mp_nombre]
            lote_obj = Lote.objects.filter(materia_prima=mp, bodega=bodega).first()
            if not lote_obj:
                return
            if MovimientoInventario.objects.filter(
                tipo=tipo, lote=lote_obj, cantidad=cantidad
            ).exists():
                return
            MovimientoInventario.objects.create(
                tipo=tipo, lote=lote_obj,
                bodega_origen=bodega, bodega_destino=None,
                cantidad=cantidad, usuario=usuario, notas=notas,
            )

        # Traslados BP → Bodega Planta
        _mov("TRASLADO", "Harina de trigo",     3000, principal, planta, "Reposición semanal")
        _mov("TRASLADO", "Azúcar blanca",        2000, principal, planta, "Reposición semanal")
        _mov("TRASLADO", "Chocolate negro 70%",   800, principal, planta, "Para brownies")
        _mov("TRASLADO", "Cacao en polvo",         500, principal, planta, "Reposición")
        _mov("TRASLADO", "Mantequilla sin sal",    500, principal, planta, "Lunes")
        _mov("TRASLADO", "Crema de leche",         400, principal, planta, "Miércoles")
        _mov("TRASLADO", "Leche entera",           600, principal, planta, "Diario")

        # Traslados Bodega Planta → Planta Producción
        _mov("TRASLADO", "Harina de trigo",      2000, planta, prod, "Producción de hoy")
        _mov("TRASLADO", "Azúcar blanca",         1500, planta, prod, "Producción de hoy")
        _mov("TRASLADO", "Chocolate negro 70%",    800, planta, prod, "Para brownies")

        # Devoluciones a proveedor
        _mov_salida("DEVOLUCION", "Leche entera",        planta,    200,
                    "Devolución por temperatura incorrecta en entrega")
        _mov_salida("DEVOLUCION", "Huevos frescos",      planta,      6,
                    "Huevos rotos detectados en recepción")
        _mov_salida("DEVOLUCION", "Mantequilla sin sal", principal,  500,
                    "Lote con olor inusual — devuelto a Lácteos El Prado")

        # Descartes por vencimiento
        _mov_salida("DESCARTE", "Leche entera",        planta, 500, "Vencimiento LEC-VENC")
        _mov_salida("DESCARTE", "Mantequilla sin sal", planta, 300, "Vencimiento MAN-VENC")
        _mov_salida("DESCARTE", "Crema de leche",      planta, 200, "Vencimiento CRE-VENC")

        self.stdout.write("    ✓ Movimientos listos")

    # ──────────────────────────────────────────────────────────────────
    # Órdenes de compra y recepciones
    # ──────────────────────────────────────────────────────────────────

    def _seed_ordenes(self, usuario):
        self.stdout.write("  Órdenes de compra y recepciones…")
        provs   = {p.nombre: p  for p  in Proveedor.objects.all()}
        mps     = {mp.nombre: mp for mp in MateriaPrima.objects.all()}
        pres_qs = Presentacion.objects.select_related("materia_prima")

        def gp(mp_nombre, pres_nombre):
            return pres_qs.filter(materia_prima__nombre=mp_nombre, nombre=pres_nombre).first()

        def oc_get(prov_nombre, delta, estado):
            return OrdenCompra.objects.get_or_create(
                proveedor=provs[prov_nombre],
                fecha_creacion=today - timedelta(days=delta),
                defaults=dict(estado=estado, usuario_creador=usuario),
            )

        def det(orden, mp_nombre, pres_nombre, pedido, recibido=0):
            DetalleOrdenCompra.objects.get_or_create(
                orden=orden,
                materia_prima=mps[mp_nombre],
                presentacion=gp(mp_nombre, pres_nombre),
                defaults=dict(cantidad_presentacion=pedido, cantidad_recibida=recibido),
            )

        def recepcion(orden, delta, justif=""):
            RecepcionMercancia.objects.get_or_create(
                orden_compra=orden,
                fecha=today - timedelta(days=delta),
                defaults=dict(usuario=usuario, confirmada=True,
                              justificacion_vencimiento=justif),
            )

        # OC-1 — Harinera (RECIBIDA, hace 10 días)
        oc1, c1 = oc_get("Harinera del Valle S.A.", 10, "RECIBIDA")
        if c1:
            det(oc1, "Harina de trigo",     "Bulto 50 kg",  5, 5)
            det(oc1, "Levadura en polvo",   "Sobre 500 g",  8, 8)
            det(oc1, "Bicarbonato de sodio","Bolsa 500 g",  4, 4)
            recepcion(oc1, 9)

        # OC-2 — Lácteos (RECIBIDA, hace 7 días) — con justificación
        oc2, c2 = oc_get("Lácteos El Prado", 7, "RECIBIDA")
        if c2:
            det(oc2, "Leche entera",       "Caja 1 L",      20, 20)
            det(oc2, "Mantequilla sin sal","Bloque 1 kg",    8,  8)
            det(oc2, "Crema de leche",     "Caja 1 L",       6,  6)
            recepcion(oc2, 6, "Leche con 3 días menos de vida útil; aceptada con descuento.")

        # OC-3 — El Sabor (RECIBIDA, hace 5 días)
        oc3, c3 = oc_get("Distribuidora El Sabor", 5, "RECIBIDA")
        if c3:
            det(oc3, "Huevos frescos",     "Cubeta 30 und",  4, 4)
            det(oc3, "Chocolate negro 70%","Barra 1 kg",     5, 5)
            det(oc3, "Esencia de vainilla","Frasco 500 ml",  3, 3)
            recepcion(oc3, 4)

        # OC-4 — Congelados (RECIBIDA, hace 3 días)
        oc4, c4 = oc_get("Congelados Premium S.A.S.", 3, "RECIBIDA")
        if c4:
            det(oc4, "Pulpa de fresa",    "Bolsa 1 kg", 10, 10)
            det(oc4, "Pulpa de maracuyá", "Bolsa 1 kg",  8,  8)
            recepcion(oc4, 2)

        # OC-5 — Azucarera (PARCIAL — llegó incompleta, hace 4 días)
        oc5, c5 = oc_get("Azucarera Nacional", 4, "PARCIAL")
        if c5:
            det(oc5, "Azúcar blanca",  "Bulto 50 kg",  6, 4)   # 2 bultos pendientes
            det(oc5, "Glucosa líquida","Frasco 1 L",   5, 0)   # sin recibir
            recepcion(oc5, 3, "Proveedor entregó parcialmente. Segunda entrega pendiente.")

        # OC-6 — Colorantes (PARCIAL, hace 1 día)
        oc6, c6 = oc_get("Colorantes Andinos", 1, "PARCIAL")
        if c6:
            det(oc6, "Colorante rojo",    "Frasco 100 ml", 10, 6)
            det(oc6, "Colorante amarillo","Frasco 100 ml", 10, 0)
            recepcion(oc6, 0)

        # OC-7 — Harinera (PENDIENTE, hace 2 días)
        oc7, c7 = oc_get("Harinera del Valle S.A.", 2, "PENDIENTE")
        if c7:
            det(oc7, "Harina de trigo", "Bulto 50 kg",  4, 0)
            det(oc7, "Manteca vegetal", "Bloque 1 kg", 10, 0)

        # OC-8 — Lácteos (PENDIENTE, hoy)
        oc8, c8 = oc_get("Lácteos El Prado", 0, "PENDIENTE")
        if c8:
            det(oc8, "Leche entera",  "Caja 1 L", 15, 0)
            det(oc8, "Crema de leche","Caja 1 L",  8, 0)

        # OC-9 — El Sabor (CANCELADA, hace 20 días)
        oc9, c9 = oc_get("Distribuidora El Sabor", 20, "CANCELADA")
        if c9:
            det(oc9, "Esencia de vainilla", "Frasco 500 ml", 2, 0)

        # OC-10 — Colorantes (CANCELADA, hace 15 días)
        oc10, c10 = oc_get("Colorantes Andinos", 15, "CANCELADA")
        if c10:
            det(oc10, "Colorante rojo", "Frasco 100 ml", 5, 0)

        self.stdout.write("    ✓ Órdenes y recepciones listas")

    # ──────────────────────────────────────────────────────────────────
    # Producción
    # ──────────────────────────────────────────────────────────────────

    def _seed_produccion(self, usuario):
        self.stdout.write("  Producción…")
        mps = {mp.nombre: mp for mp in MateriaPrima.objects.all()}
        pts = {pt.nombre: pt for pt in ProductoTerminado.objects.all()}

        def primer_lote(mp_nombre):
            return Lote.objects.filter(materia_prima__nombre=mp_nombre).first()

        def batido(pt_nombre, delta, hora, estado, ingredientes, lotes_pt):
            """
            lotes_pt: list of (cantidad, vida_dias, estado_lote, despacho_delta_or_None)
            despacho_delta_or_None: days after fecha_prod when dispatched; None = no dispatch
            """
            pt_obj     = pts[pt_nombre]
            fecha_prod = today + timedelta(days=delta)
            b, created = Batido.objects.get_or_create(
                producto_terminado=pt_obj,
                fecha_produccion=fecha_prod,
                hora_inicio=hora,
                defaults=dict(estado=estado, usuario=usuario),
            )
            if created:
                for mp_nombre, cantidad in ingredientes:
                    lote_obj = primer_lote(mp_nombre)
                    if lote_obj:
                        DetalleBatido.objects.create(
                            batido=b, materia_prima=mps[mp_nombre],
                            lote=lote_obj, cantidad=cantidad,
                        )
                for cant, vida, est_lote, desp_delta in lotes_pt:
                    LoteProductoTerminado.objects.create(
                        batido=b, estado=est_lote, cantidad=cant,
                        fecha_produccion=fecha_prod,
                        fecha_vencimiento=fecha_prod + timedelta(days=vida),
                        fecha_despacho=(fecha_prod + timedelta(days=desp_delta)
                                        if desp_delta is not None else None),
                    )
            return b

        PDV = "EN_PUNTO_DE_VENTA"
        ESP = "EN_ESPERA"

        # ── Semana -4 ─────────────────────────────────────────────────
        batido("Torta de chocolate", -27, "07:00", "COMPLETADO",
               [("Harina de trigo", 800), ("Azúcar blanca", 600),
                ("Chocolate negro 70%", 400), ("Mantequilla sin sal", 300),
                ("Huevos frescos", 6), ("Leche entera", 300)],
               [(8, 5, PDV, 1), (2, 5, PDV, 2)])
        batido("Galletas de mantequilla", -26, "08:00", "COMPLETADO",
               [("Harina de trigo", 500), ("Azúcar blanca", 350),
                ("Mantequilla sin sal", 400), ("Huevos frescos", 3)],
               [(20, 7, PDV, 2), (5, 7, PDV, 3)])
        batido("Ponqué de vainilla", -25, "09:00", "COMPLETADO",
               [("Harina de trigo", 700), ("Azúcar blanca", 500),
                ("Mantequilla sin sal", 350), ("Huevos frescos", 5),
                ("Esencia de vainilla", 15), ("Leche entera", 200)],
               [(6, 4, PDV, 1), (2, 4, PDV, 1)])

        # ── Semana -3 ─────────────────────────────────────────────────
        batido("Brownies de chocolate", -20, "08:00", "COMPLETADO",
               [("Harina de trigo", 400), ("Azúcar blanca", 450),
                ("Chocolate negro 70%", 350), ("Mantequilla sin sal", 250),
                ("Huevos frescos", 4), ("Cacao en polvo", 80)],
               [(12, 5, PDV, 1), (3, 5, PDV, 2)])
        batido("Bizcocho de canela", -19, "07:30", "COMPLETADO",
               [("Harina de trigo", 600), ("Azúcar blanca", 400),
                ("Mantequilla sin sal", 200), ("Huevos frescos", 4),
                ("Leche entera", 250), ("Canela en polvo", 20),
                ("Levadura en polvo", 15)],
               [(8, 3, PDV, 1), (4, 3, PDV, 2)])
        batido("Torta de fresa", -18, "08:30", "COMPLETADO",
               [("Harina de trigo", 750), ("Azúcar blanca", 550),
                ("Mantequilla sin sal", 300), ("Huevos frescos", 6),
                ("Pulpa de fresa", 400), ("Crema de leche", 200)],
               [(6, 3, PDV, 1), (2, 3, PDV, 1)])

        # ── Semana -2 ─────────────────────────────────────────────────
        batido("Torta tres leches", -13, "07:00", "COMPLETADO",
               [("Harina de trigo", 900), ("Azúcar blanca", 700),
                ("Huevos frescos", 8), ("Leche entera", 500),
                ("Crema de leche", 400), ("Esencia de vainilla", 20)],
               [(5, 3, PDV, 1), (2, 3, PDV, 1)])
        batido("Cupcakes de vainilla", -12, "09:00", "COMPLETADO",
               [("Harina de trigo", 300), ("Azúcar blanca", 280),
                ("Mantequilla sin sal", 180), ("Huevos frescos", 3),
                ("Esencia de vainilla", 12), ("Leche entera", 120)],
               [(24, 4, PDV, 1)])
        batido("Galletas de chocolate", -11, "08:00", "COMPLETADO",
               [("Harina de trigo", 450), ("Azúcar blanca", 380),
                ("Chocolate negro 70%", 200), ("Mantequilla sin sal", 200),
                ("Huevos frescos", 3), ("Cacao en polvo", 60)],
               [(18, 7, PDV, 1), (6, 7, PDV, 2)])
        # Batido cancelado (ingredientes insuficientes)
        batido("Torta de maracuyá", -10, "10:00", "CANCELADO",
               [("Harina de trigo", 800), ("Azúcar blanca", 600)],
               [])

        # ── Semana -1 ─────────────────────────────────────────────────
        batido("Torta de chocolate", -6, "07:00", "COMPLETADO",
               [("Harina de trigo", 800), ("Azúcar blanca", 600),
                ("Chocolate negro 70%", 400), ("Mantequilla sin sal", 300),
                ("Huevos frescos", 6), ("Leche entera", 300)],
               [(8, 5, PDV, 1), (2, 5, PDV, 1)])
        batido("Ponqué de vainilla", -5, "08:00", "COMPLETADO",
               [("Harina de trigo", 700), ("Azúcar blanca", 500),
                ("Mantequilla sin sal", 350), ("Huevos frescos", 5),
                ("Esencia de vainilla", 15)],
               [(6, 4, PDV, 1)])
        batido("Milhojas", -4, "09:00", "COMPLETADO",
               [("Harina de trigo", 600), ("Mantequilla sin sal", 500),
                ("Azúcar blanca", 200), ("Crema de leche", 300)],
               [(10, 2, PDV, 1), (5, 2, PDV, 1)])

        # ── Semana actual ─────────────────────────────────────────────
        batido("Brownies de chocolate", -3, "08:00", "COMPLETADO",
               [("Harina de trigo", 400), ("Azúcar blanca", 450),
                ("Chocolate negro 70%", 350), ("Mantequilla sin sal", 250),
                ("Huevos frescos", 4), ("Cacao en polvo", 80)],
               [(12, 5, PDV, 1), (3, 5, PDV, 1)])
        batido("Torta de maracuyá", -2, "07:30", "COMPLETADO",
               [("Harina de trigo", 800), ("Azúcar blanca", 600),
                ("Pulpa de maracuyá", 500), ("Huevos frescos", 6),
                ("Crema de leche", 250), ("Gelatina sin sabor", 30)],
               [(5, 3, PDV, 1), (2, 3, ESP, None)])

        # En proceso hoy
        batido("Bizcocho de canela", 0, "07:00", "EN_PROCESO",
               [("Harina de trigo", 600), ("Azúcar blanca", 400),
                ("Mantequilla sin sal", 200), ("Huevos frescos", 4),
                ("Leche entera", 250), ("Canela en polvo", 20), ("Levadura en polvo", 15)],
               [(8, 3, ESP, None)])
        batido("Torta tres leches", 0, "10:00", "EN_PROCESO",
               [("Harina de trigo", 900), ("Azúcar blanca", 700),
                ("Huevos frescos", 8), ("Leche entera", 500),
                ("Crema de leche", 400), ("Esencia de vainilla", 20)],
               [(5, 3, ESP, None)])
        batido("Torta de fresa", 0, "11:00", "EN_PROCESO",
               [("Harina de trigo", 750), ("Azúcar blanca", 550),
                ("Pulpa de fresa", 400), ("Crema de leche", 200),
                ("Huevos frescos", 5), ("Colorante rojo", 5)],
               [(6, 3, ESP, None)])

        # Programado para mañana
        batido("Cupcakes de vainilla", 1, "09:00", "EN_PROCESO",
               [("Harina de trigo", 300), ("Azúcar blanca", 280),
                ("Mantequilla sin sal", 180), ("Huevos frescos", 3),
                ("Esencia de vainilla", 12), ("Leche entera", 120),
                ("Colorante amarillo", 3)],
               [(24, 4, ESP, None)])

        # Lote PT vencido sin despachar (alerta EN_ESPERA_PENDIENTE)
        pt_choc = pts.get("Torta de chocolate")
        if pt_choc:
            b_old, c_old = Batido.objects.get_or_create(
                producto_terminado=pt_choc,
                fecha_produccion=today - timedelta(days=10),
                hora_inicio="06:00",
                defaults=dict(estado="COMPLETADO", usuario=usuario),
            )
            if c_old:
                lote_obj = Lote.objects.filter(materia_prima__nombre="Harina de trigo").first()
                if lote_obj:
                    DetalleBatido.objects.create(
                        batido=b_old, materia_prima=mps["Harina de trigo"],
                        lote=lote_obj, cantidad=800,
                    )
                LoteProductoTerminado.objects.get_or_create(
                    batido=b_old, estado=ESP,
                    defaults=dict(
                        cantidad=3,
                        fecha_produccion=today - timedelta(days=10),
                        fecha_vencimiento=today - timedelta(days=5),
                        fecha_despacho=None,
                    ),
                )

        self.stdout.write("    ✓ Producción lista")

    # ──────────────────────────────────────────────────────────────────
    # Movimientos Compensatorios
    # ──────────────────────────────────────────────────────────────────

    def _seed_compensatorios(self, usuario):
        self.stdout.write("  Movimientos compensatorios…")
        if MovimientoCompensatorio.objects.exists():
            self.stdout.write("    ✓ Compensatorios ya existen, se omiten")
            return

        b = Batido.objects.filter(estado="COMPLETADO").order_by("-fecha_produccion").first()
        if b:
            MovimientoCompensatorio.objects.create(
                tipo_afectado="Batido", id_afectado=b.pk,
                datos_originales={"harina_g": 800},
                datos_corregidos={"harina_g": 750},
                descripcion="Corrección de cantidad de harina registrada incorrectamente al inicio del turno.",
                usuario=usuario,
            )

        lpt = LoteProductoTerminado.objects.filter(estado="EN_PUNTO_DE_VENTA").first()
        if lpt:
            MovimientoCompensatorio.objects.create(
                tipo_afectado="LoteProductoTerminado", id_afectado=lpt.pk,
                datos_originales={"cantidad": str(lpt.cantidad)},
                datos_corregidos={"cantidad": str(int(lpt.cantidad) - 1)},
                descripcion="Ajuste: unidad reportada como despachada no salió. Se corrige el conteo.",
                usuario=usuario,
            )

        self.stdout.write("    ✓ Compensatorios listos")

    # ──────────────────────────────────────────────────────────────────
    # Alertas
    # ──────────────────────────────────────────────────────────────────

    def _seed_alertas(self):
        self.stdout.write("  Alertas…")
        mps     = {mp.nombre: mp for mp in MateriaPrima.objects.all()}
        bodegas = {b.nombre:  b  for b  in Bodega.objects.all()}

        def activa(tipo, mp_nombre=None, bodega_nombre=None, lote_filter=None, mensaje=""):
            mp     = mps.get(mp_nombre)     if mp_nombre     else None
            bodega = bodegas.get(bodega_nombre) if bodega_nombre else None
            lote   = (Lote.objects.filter(materia_prima=mp, **lote_filter).first()
                      if lote_filter and mp else None)
            Alerta.objects.get_or_create(
                tipo=tipo, materia_prima=mp, bodega=bodega,
                lote=lote, activa=True, defaults=dict(mensaje=mensaje),
            )

        def resuelta(tipo, mp_nombre=None, bodega_nombre=None, mensaje="", dias_atras=3):
            mp     = mps.get(mp_nombre)     if mp_nombre     else None
            bodega = bodegas.get(bodega_nombre) if bodega_nombre else None
            if not Alerta.objects.filter(tipo=tipo, materia_prima=mp,
                                         bodega=bodega, activa=False).exists():
                Alerta.objects.create(
                    tipo=tipo, materia_prima=mp, bodega=bodega,
                    activa=False, mensaje=mensaje,
                    fecha_resolucion=timezone.now() - timedelta(days=dias_atras),
                )

        # Activas — stock bajo
        activa("STOCK_BAJO", "Esencia de vainilla", BODEGA_PLANTA,
               mensaje="Stock de Esencia de vainilla por debajo del punto de reorden (80 ml < 200 ml).")
        activa("STOCK_BAJO", "Levadura en polvo", BODEGA_PLANTA,
               mensaje="Stock de Levadura en polvo por debajo del punto de reorden (150 g < 500 g).")
        activa("STOCK_BAJO", "Canela en polvo", BODEGA_PLANTA,
               mensaje="Stock de Canela en polvo por debajo del punto de reorden (40 g < 100 g).")

        # Activas — vencimiento próximo
        activa("VENCIMIENTO_PROXIMO", "Leche entera", BODEGA_PLANTA,
               lote_filter={"numero_lote": "LEC-VENC"},
               mensaje="Lote LEC-VENC de Leche entera vence en 2 días.")
        activa("VENCIMIENTO_PROXIMO", "Crema de leche", BODEGA_PLANTA,
               lote_filter={"numero_lote": "CRE-VENC"},
               mensaje="Lote CRE-VENC de Crema de leche vence en 3 días.")
        activa("VENCIMIENTO_PROXIMO", "Mantequilla sin sal", BODEGA_PLANTA,
               lote_filter={"numero_lote": "MAN-VENC"},
               mensaje="Lote MAN-VENC de Mantequilla sin sal vence en 4 días.")
        activa("VENCIMIENTO_PROXIMO", "Huevos frescos", BODEGA_PLANTA,
               lote_filter={"numero_lote": "HUE-VENC"},
               mensaje="Lote HUE-VENC de Huevos frescos vence en 4 días.")

        # Activa — PT en espera pendiente
        activa("EN_ESPERA_PENDIENTE",
               mensaje="Lote de Torta de chocolate lleva 5 días en EN_ESPERA sin despacharse y ya venció.")

        # Resueltas (historial)
        resuelta("STOCK_BAJO", "Chocolate negro 70%", BODEGA_PLANTA,
                 mensaje="Stock de Chocolate negro 70% estaba bajo — reordenado.", dias_atras=5)
        resuelta("STOCK_BAJO", "Cacao en polvo", BODEGA_PLANTA,
                 mensaje="Stock de Cacao en polvo bajo — repuesto vía traslado.", dias_atras=8)
        resuelta("VENCIMIENTO_PROXIMO", "Leche entera", BODEGA_PLANTA,
                 mensaje="Lote anterior de Leche entera venció — descartado.", dias_atras=4)
        resuelta("VENCIMIENTO_PROXIMO", "Mantequilla sin sal", BODEGA_PRINCIPAL,
                 mensaje="Lote MAN-VENC-OLD de Mantequilla devuelta a proveedor.", dias_atras=6)
        resuelta("EN_ESPERA_PENDIENTE",
                 mensaje="Lote antiguo de Galletas de mantequilla despachado a tiempo.", dias_atras=10)

        self.stdout.write("    ✓ Alertas listas")

    # ──────────────────────────────────────────────────────────────────
    # Configuración de alertas (singleton)
    # ──────────────────────────────────────────────────────────────────

    def _seed_configuracion_alerta(self):
        self.stdout.write("  Configuración de alertas…")
        ConfiguracionAlerta.objects.get_or_create(
            pk=1,
            defaults=dict(
                whatsapp_numero="+573001234567",
                email_gerencia="gerente.demo@daluzed.com",
                email_produccion="produccion.demo@daluzed.com",
                dias_umbral_vencimiento=7,
            ),
        )
        self.stdout.write("    ✓ Configuración de alertas lista")

    # ──────────────────────────────────────────────────────────────────
    # Bitácora de auditoría
    # ──────────────────────────────────────────────────────────────────

    def _seed_bitacora(self, users):
        self.stdout.write("  Bitácora de auditoría…")
        if BitacoraOperacion.objects.exists():
            self.stdout.write("    ✓ Bitácora ya existe, se omiten")
            return

        admin      = users["admin"]
        gerente    = users["gerente"]
        produccion = users["produccion"]
        inventario = users["inventario"]
        now        = timezone.now()

        entradas = [
            # (usuario, accion, detalle, ip, delta_dias)
            (admin,      "LOGIN",            {"email": admin.email},                         "192.168.1.1",  -7),
            (gerente,    "LOGIN",            {"email": gerente.email},                       "192.168.1.2",  -7),
            (inventario, "LOGIN",            {"email": inventario.email},                    "192.168.1.3",  -6),
            (produccion, "LOGIN",            {"email": produccion.email},                    "192.168.1.4",  -6),
            (admin,      "LOGIN",            {"email": admin.email},                         "192.168.1.1",  -5),
            (inventario, "LOGIN",            {"email": inventario.email},                    "192.168.1.3",  -5),
            (produccion, "LOGIN",            {"email": produccion.email},                    "192.168.1.4",  -4),
            (admin,      "LOGIN",            {"email": admin.email},                         "192.168.1.1",  -3),
            (gerente,    "LOGIN",            {"email": gerente.email},                       "192.168.1.2",  -3),
            (inventario, "LOGIN",            {"email": inventario.email},                    "192.168.1.3",  -2),
            (produccion, "LOGIN",            {"email": produccion.email},                    "192.168.1.4",  -2),
            (admin,      "LOGIN",            {"email": admin.email},                         "192.168.1.1",  -1),
            (inventario, "LOGIN",            {"email": inventario.email},                    "192.168.1.3",   0),
            (produccion, "LOGIN",            {"email": produccion.email},                    "192.168.1.4",   0),
            (admin,      "LOGOUT",           {"email": admin.email},                         "192.168.1.1",  -7),
            (gerente,    "LOGOUT",           {"email": gerente.email},                       "192.168.1.2",  -7),
            (inventario, "LOGOUT",           {"email": inventario.email},                    "192.168.1.3",  -6),
            (inventario, "RECEPCION_CREADA", {"proveedor": "Harinera del Valle S.A."},       "192.168.1.3",  -9),
            (inventario, "RECEPCION_CREADA", {"proveedor": "Lácteos El Prado"},              "192.168.1.3",  -6),
            (inventario, "RECEPCION_CREADA", {"proveedor": "Distribuidora El Sabor"},        "192.168.1.3",  -4),
            (inventario, "RECEPCION_CREADA", {"proveedor": "Congelados Premium S.A.S."},     "192.168.1.3",  -2),
            (inventario, "RECEPCION_CREADA", {"proveedor": "Azucarera Nacional (parcial)"},  "192.168.1.3",  -3),
            (inventario, "TRASLADO",         {"mp": "Harina de trigo",     "cantidad_g": 3000}, "192.168.1.3", -7),
            (inventario, "TRASLADO",         {"mp": "Azúcar blanca",       "cantidad_g": 2000}, "192.168.1.3", -7),
            (inventario, "TRASLADO",         {"mp": "Chocolate negro 70%", "cantidad_g":  800}, "192.168.1.3", -5),
            (inventario, "TRASLADO",         {"mp": "Harina de trigo",     "cantidad_g": 2000,
                                              "origen": "Planta", "destino": "Producción"},  "192.168.1.3", -3),
            (produccion, "BATIDO_CREADO",    {"producto": "Torta de chocolate",    "fecha": str(today - timedelta(6))},  "192.168.1.4", -6),
            (produccion, "BATIDO_CREADO",    {"producto": "Brownies de chocolate", "fecha": str(today - timedelta(3))},  "192.168.1.4", -3),
            (produccion, "BATIDO_CREADO",    {"producto": "Bizcocho de canela",    "fecha": str(today)},                 "192.168.1.4",  0),
            (produccion, "BATIDO_CREADO",    {"producto": "Torta tres leches",     "fecha": str(today)},                 "192.168.1.4",  0),
            (produccion, "DESPACHO",         {"producto": "Torta de chocolate",    "cantidad": 8},  "192.168.1.4", -5),
            (produccion, "DESPACHO",         {"producto": "Galletas de mantequilla","cantidad": 20},"192.168.1.4", -4),
            (produccion, "DESPACHO",         {"producto": "Brownies de chocolate", "cantidad": 12}, "192.168.1.4", -2),
            (admin,      "COMPENSATORIO",    {"tipo": "Batido", "descripcion": "Corrección cantidad harina"}, "192.168.1.1", -1),
        ]

        for user, accion, detalle, ip, delta in entradas:
            if user:
                op = BitacoraOperacion.objects.create(
                    usuario=user, accion=accion, detalle=detalle, ip=ip,
                )
                BitacoraOperacion.objects.filter(pk=op.pk).update(
                    fecha=now + timedelta(days=delta),
                )

        self.stdout.write("    ✓ Bitácora lista")
