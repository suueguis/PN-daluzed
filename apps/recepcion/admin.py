from django.contrib import admin
from .models import OrdenCompra, DetalleOrdenCompra, RecepcionMercancia

admin.site.register(OrdenCompra)
admin.site.register(DetalleOrdenCompra)
admin.site.register(RecepcionMercancia)
