from django.contrib import admin
from apps.catalogo.models import (
    UnidadMedida, Proveedor, MateriaPrima, Presentacion, ProductoTerminado
)

admin.site.register(UnidadMedida)
admin.site.register(Proveedor)
admin.site.register(MateriaPrima)
admin.site.register(Presentacion)
admin.site.register(ProductoTerminado)
