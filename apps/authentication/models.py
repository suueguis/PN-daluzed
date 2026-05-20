from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    # RF-AUT-02: Roles del sistema
    ROLES = (
        ('ADMIN', 'Administrador'),
        ('GERENTE', 'Gerencia'),
        ('PRODUCCION', 'Jefe de Producción'),
        ('INVENTARIO', 'Encargado de Inventarios'),
    )
    
    username = None # Eliminamos el username
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLES, default='INVENTARIO')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.email} - {self.role}"