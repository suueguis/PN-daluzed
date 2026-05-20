# apps/authentication/services.py
from rest_framework_simplejwt.tokens import RefreshToken


class AuthService:

    @staticmethod
    def generate_tokens_for_user(user) -> dict:
        """
        Genera access y refresh tokens para el usuario autenticado.
        Devuelve el rol extraído del primer grupo de Django (RBAC).
        Si el usuario no tiene grupos asignados, usa el campo 'role' del modelo.
        """
        refresh = RefreshToken.for_user(user)

        # Rol desde el primer grupo de Django (configurado en el admin)
        first_group = user.groups.first()
        role = first_group.name if first_group else user.role

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.email,   # username = email (campo USERNAME_FIELD del modelo)
            "role": role,
        }