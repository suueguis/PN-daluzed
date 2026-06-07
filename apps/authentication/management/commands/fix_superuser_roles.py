"""
Actualiza todos los superusers que tienen role='INVENTARIO' (default incorrecto)
a role='ADMIN'. Idempotente.

Uso:
    python manage.py fix_superuser_roles
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Asigna role='ADMIN' a todos los superusers que tengan rol distinto."

    def handle(self, *args, **options):
        updated = User.objects.filter(is_superuser=True).exclude(role='ADMIN').update(role='ADMIN')
        self.stdout.write(self.style.SUCCESS(f"✓ {updated} superuser(s) actualizados a role='ADMIN'."))
