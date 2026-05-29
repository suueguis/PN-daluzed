from django.db import models


class UnidadMedida(models.Model):
    """Unidad base de inventario: gramos, mililitros, unidades, etc. Gestionable desde la UI."""

    nombre = models.CharField(max_length=50, unique=True)
    simbolo = models.CharField(max_length=10, unique=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Unidad de medida'
        verbose_name_plural = 'Unidades de medida'
        ordering = ['nombre']

    def __str__(self) -> str:
        return f'{self.nombre} ({self.simbolo})'


class Proveedor(models.Model):
    """Proveedor de materias primas. Relación M2M con MateriaPrima."""

    nombre = models.CharField(max_length=200, unique=True)
    contacto = models.CharField(max_length=200, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'
        ordering = ['nombre']

    def __str__(self) -> str:
        return self.nombre


class MateriaPrima(models.Model):
    """
    Insumo registrado en el catálogo.
    El stock se lleva en la unidad base; las presentaciones de compra
    se convierten automáticamente con su factor_conversion.
    El punto de reorden aplica SOLO sobre Bodega Principal (RF-INV-08).
    """

    CATEGORIA_CHOICES = [
        ('GALLETERIA', 'Galletería'),
        ('TORTA', 'Torta'),
        ('BIZCOCHO', 'Bizcocho'),
        ('GENERAL', 'General'),
    ]
    CONDICION_CHOICES = [
        ('AMBIENTE', 'Temperatura ambiente'),
        ('REFRIGERACION', 'Refrigeración'),
        ('CONGELADO', 'Congelado'),
    ]

    nombre = models.CharField(max_length=200, unique=True)
    unidad_medida = models.ForeignKey(
        UnidadMedida,
        on_delete=models.PROTECT,
        related_name='materias_primas',
    )
    punto_reorden = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    dias_minimos_vencimiento = models.PositiveIntegerField(null=True, blank=True)
    categoria = models.CharField(
        max_length=20, choices=CATEGORIA_CHOICES, default='GENERAL'
    )
    condicion_almacenamiento = models.CharField(
        max_length=20, choices=CONDICION_CHOICES, default='AMBIENTE'
    )
    activo = models.BooleanField(default=True)
    proveedores = models.ManyToManyField(
        Proveedor, blank=True, related_name='materias_primas'
    )

    class Meta:
        verbose_name = 'Materia prima'
        verbose_name_plural = 'Materias primas'
        ordering = ['nombre']

    def __str__(self) -> str:
        return self.nombre


class Presentacion(models.Model):
    """
    Presentación de compra de una materia prima.
    factor_conversion = cuántas unidades base equivale 1 unidad de esta presentación.
    Ejemplo: 1 bolsa de 50 kg → factor_conversion = 50 000 (si la unidad base es gramos).
    costo = precio de compra por presentación.
    """

    nombre = models.CharField(max_length=100)
    materia_prima = models.ForeignKey(
        MateriaPrima, on_delete=models.CASCADE, related_name='presentaciones'
    )
    unidad_medida = models.ForeignKey(
        UnidadMedida, on_delete=models.PROTECT, related_name='presentaciones'
    )
    factor_conversion = models.DecimalField(max_digits=14, decimal_places=4)
    costo = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Presentación'
        verbose_name_plural = 'Presentaciones'
        unique_together = [('materia_prima', 'nombre')]
        ordering = ['nombre']

    def __str__(self) -> str:
        return f'{self.nombre} — {self.materia_prima.nombre}'


class ProductoTerminado(models.Model):
    """
    Producto del catálogo con vida útil configurable (RF-CAT-09).
    Código interno auto-generado en formato INPE### (RF-CAT-03).
    Las recetas NO se almacenan aquí (secreto industrial).
    """

    codigo = models.CharField(max_length=20, unique=True, blank=True)
    nombre = models.CharField(max_length=200, unique=True)
    vida_util_dias = models.PositiveIntegerField()
    unidad_medida = models.ForeignKey(
        UnidadMedida,
        on_delete=models.PROTECT,
        related_name='productos_terminados',
    )
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Producto terminado'
        verbose_name_plural = 'Productos terminados'
        ordering = ['nombre']

    def save(self, *args, **kwargs) -> None:
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.codigo:
            # Genera el código desde el PK garantizando unicidad sin race conditions.
            self.codigo = f'INPE{self.pk:03d}'
            ProductoTerminado.objects.filter(pk=self.pk).update(codigo=self.codigo)

    def __str__(self) -> str:
        return f'{self.codigo} — {self.nombre}'
