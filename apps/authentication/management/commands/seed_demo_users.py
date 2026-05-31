from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


User = get_user_model()


class Command(BaseCommand):
    help = 'Crea o actualiza usuarios de prueba, uno por cada rol del sistema.'

    demo_users = (
        {
            'email': 'admin.demo@daluzed.com',
            'role': 'ADMIN',
            'is_staff': True,
            'is_superuser': True,
        },
        {
            'email': 'gerente.demo@daluzed.com',
            'role': 'GERENTE',
            'is_staff': False,
            'is_superuser': False,
        },
        {
            'email': 'produccion.demo@daluzed.com',
            'role': 'PRODUCCION',
            'is_staff': False,
            'is_superuser': False,
        },
        {
            'email': 'inventario.demo@daluzed.com',
            'role': 'INVENTARIO',
            'is_staff': False,
            'is_superuser': False,
        },
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            default='Daluzed2026!',
            help='Contraseña para todos los usuarios de prueba.',
        )

    def handle(self, *args, **options):
        password = options['password']
        created = 0
        updated = 0

        for user_data in self.demo_users:
            user, was_created = User.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    'role': user_data['role'],
                    'is_staff': user_data['is_staff'],
                    'is_superuser': user_data['is_superuser'],
                },
            )

            user.role = user_data['role']
            user.is_staff = user_data['is_staff']
            user.is_superuser = user_data['is_superuser']
            user.is_active = True
            user.set_password(password)
            user.save()

            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Usuarios de prueba listos: {created} creados, {updated} actualizados.'
            )
        )
