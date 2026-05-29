from django.contrib import admin
from .models import Bodega, Lote, MovimientoInventario

admin.site.register(Bodega)
admin.site.register(Lote)
admin.site.register(MovimientoInventario)
