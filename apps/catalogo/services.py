from __future__ import annotations

from typing import Any

from django.db import transaction


class CatalogoService:
    """Lógica de negocio del módulo Catálogo Maestro. Sin dependencias HTTP."""

    # ─────────────────────────────────────────────────────────────────
    # Materias primas
    # ─────────────────────────────────────────────────────────────────

    @staticmethod
    def desactivar_materia_prima(mp) -> None:
        """
        Soft-delete de una materia prima.
        Lanza ValueError si existen lotes con cantidad > 0 en inventario (RF-CAT-01).
        La comprobación es segura si el módulo inventario aún no está instalado.
        """
        try:
            from apps.inventario.models import Lote  # noqa: PLC0415

            if Lote.objects.filter(materia_prima=mp, cantidad__gt=0).exists():
                raise ValueError(
                    f'La materia prima "{mp.nombre}" tiene lotes con stock activo '
                    'y no puede desactivarse.'
                )
        except (ImportError, LookupError):
            # Módulo inventario aún no instalado; se permite desactivar.
            pass

        mp.activo = False
        mp.save(update_fields=['activo'])

    @staticmethod
    def asociar_proveedor(mp, proveedor) -> None:
        """Asocia un proveedor existente a la materia prima (M2M)."""
        mp.proveedores.add(proveedor)

    # ─────────────────────────────────────────────────────────────────
    # Importación masiva desde Excel / CSV
    # ─────────────────────────────────────────────────────────────────

    @staticmethod
    def importar_desde_archivo(archivo, tipo: str) -> dict[str, Any]:
        """
        Importa registros del catálogo desde un archivo .xlsx o .csv.
        Retorna {'procesados': N, 'creados': N, 'errores': [{'fila': N, 'error': str}]}.
        Los tipos soportados son: materias_primas, productos_terminados, proveedores.
        """
        nombre = getattr(archivo, 'name', '').lower()
        es_excel = nombre.endswith(('.xlsx', '.xls'))

        filas = (
            CatalogoService._leer_excel(archivo)
            if es_excel
            else CatalogoService._leer_csv(archivo)
        )

        procesados = 0
        creados = 0
        errores: list[dict] = []

        creadores = {
            'materias_primas': CatalogoService._crear_mp_desde_fila,
            'productos_terminados': CatalogoService._crear_pt_desde_fila,
            'proveedores': CatalogoService._crear_proveedor_desde_fila,
        }
        crear = creadores[tipo]

        for num_fila, fila in enumerate(filas, start=2):
            procesados += 1
            try:
                with transaction.atomic():
                    crear(fila)
                creados += 1
            except Exception as exc:
                errores.append({'fila': num_fila, 'error': str(exc)})

        return {'procesados': procesados, 'creados': creados, 'errores': errores}

    # ─── helpers privados ────────────────────────────────────────────

    @staticmethod
    def _leer_excel(archivo) -> list[dict]:
        import openpyxl  # noqa: PLC0415

        wb = openpyxl.load_workbook(archivo, read_only=True, data_only=True)
        ws = wb.active
        filas = list(ws.iter_rows(values_only=True))
        if not filas:
            return []
        encabezados = [str(h).strip().lower() if h is not None else '' for h in filas[0]]
        return [
            {encabezados[j]: (celda if celda is not None else '') for j, celda in enumerate(fila)}
            for fila in filas[1:]
        ]

    @staticmethod
    def _leer_csv(archivo) -> list[dict]:
        import csv
        import io  # noqa: PLC0415

        contenido = archivo.read()
        if isinstance(contenido, bytes):
            contenido = contenido.decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(contenido))
        return [{k.strip().lower(): v.strip() for k, v in fila.items()} for fila in reader]

    @staticmethod
    def _crear_mp_desde_fila(fila: dict) -> None:
        from apps.catalogo.models import MateriaPrima, UnidadMedida  # noqa: PLC0415

        nombre = str(fila.get('nombre', '')).strip()
        if not nombre:
            raise ValueError('El campo "nombre" es obligatorio.')

        simbolo = str(fila.get('simbolo_unidad', '')).strip()
        um = UnidadMedida.objects.filter(simbolo__iexact=simbolo).first()
        if not um:
            raise ValueError(f'Unidad de medida con símbolo "{simbolo}" no encontrada.')

        MateriaPrima.objects.get_or_create(
            nombre=nombre,
            defaults={
                'unidad_medida': um,
                'punto_reorden': fila.get('punto_reorden') or 0,
                'dias_minimos_vencimiento': fila.get('dias_minimos_vencimiento') or None,
                'categoria': str(fila.get('categoria', 'GENERAL')).upper() or 'GENERAL',
                'condicion_almacenamiento': str(
                    fila.get('condicion_almacenamiento', 'AMBIENTE')
                ).upper() or 'AMBIENTE',
            },
        )

    @staticmethod
    def _crear_pt_desde_fila(fila: dict) -> None:
        from apps.catalogo.models import ProductoTerminado, UnidadMedida  # noqa: PLC0415

        nombre = str(fila.get('nombre', '')).strip()
        if not nombre:
            raise ValueError('El campo "nombre" es obligatorio.')

        simbolo = str(fila.get('simbolo_unidad', '')).strip()
        um = UnidadMedida.objects.filter(simbolo__iexact=simbolo).first()
        if not um:
            raise ValueError(f'Unidad de medida con símbolo "{simbolo}" no encontrada.')

        vida_util = int(fila.get('vida_util_dias') or 0)
        if vida_util <= 0:
            raise ValueError('"vida_util_dias" debe ser un entero positivo.')

        ProductoTerminado.objects.get_or_create(
            nombre=nombre,
            defaults={'vida_util_dias': vida_util, 'unidad_medida': um},
        )

    @staticmethod
    def _crear_proveedor_desde_fila(fila: dict) -> None:
        from apps.catalogo.models import Proveedor  # noqa: PLC0415

        nombre = str(fila.get('nombre', '')).strip()
        if not nombre:
            raise ValueError('El campo "nombre" es obligatorio.')

        Proveedor.objects.get_or_create(
            nombre=nombre,
            defaults={
                'contacto': fila.get('contacto', ''),
                'telefono': str(fila.get('telefono', '')),
                'email': fila.get('email', ''),
            },
        )
