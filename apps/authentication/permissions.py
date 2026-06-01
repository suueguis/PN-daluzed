from rest_framework.permissions import BasePermission, SAFE_METHODS


def allow_roles(*roles):
    """
    Factory que devuelve una clase de permiso que sólo admite los roles indicados.
    Uso: permission_classes = [allow_roles('ADMIN', 'INVENTARIO')]
    """
    class _RolePermission(BasePermission):
        message = 'Su rol no tiene permiso para realizar esta acción.'

        def has_permission(self, request, view):
            return bool(
                request.user
                and request.user.is_authenticated
                and request.user.role in roles
            )

    _RolePermission.__name__ = f"AllowRoles({'|'.join(roles)})"
    return _RolePermission


def allow_roles_rw(*, read, write):
    """
    Factory que separa roles de lectura (métodos seguros) y escritura (mutaciones).
    Uso: permission_classes = [allow_roles_rw(read=(...), write=(...))]
    """
    class _RWPermission(BasePermission):
        message = 'Su rol no tiene permiso para realizar esta acción.'

        def has_permission(self, request, view):
            if not (request.user and request.user.is_authenticated):
                return False
            if request.method in SAFE_METHODS:
                return request.user.role in read
            return request.user.role in write

    _RWPermission.__name__ = (
        f"AllowRoles(R:{'|'.join(read)},W:{'|'.join(write)})"
    )
    return _RWPermission
