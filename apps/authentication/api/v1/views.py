# apps/authentication/api/v1/views.py
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from drf_spectacular.utils import extend_schema, OpenApiResponse
from axes.models import AccessAttempt

from .serializers import (
    LoginSerializer,
    CambiarContrasenaSerializer,
    UserSerializer,
    CreateUserSerializer,
    PatchUserSerializer,
)
from apps.authentication.permissions import allow_roles
from apps.authentication.services import AuthService
from apps.auditoria.services import registrar_operacion, get_client_ip

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# Helper de cookie
# ─────────────────────────────────────────────────────────────────────────────

def _set_refresh_cookie(response, refresh_token: str) -> None:
    """
    Setea el refresh token como cookie HttpOnly.
    Secure=False en DEBUG (HTTP local), Secure=True en producción (HTTPS).
    SameSite=Lax: protege contra CSRF sin romper navegación normal.
    """
    from datetime import timedelta
    lifetime: timedelta = settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME', timedelta(days=7))
    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Lax',
        max_age=int(lifetime.total_seconds()),
        path='/api/v1/auth/',
    )


def _clear_refresh_cookie(response) -> None:
    response.delete_cookie('refresh_token', path='/api/v1/auth/')


# ─────────────────────────────────────────────────────────────────────────────
# Login
# ─────────────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    """
    RF-AUT-01: Autenticación por email y contraseña con protección Axes.
    Devuelve access token, refresh token, username (email) y rol del usuario.
    El refresh token se envía también como cookie HttpOnly (seguridad extra).
    """
    permission_classes = []
    authentication_classes = []

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: OpenApiResponse(description="Login exitoso. Retorna access, refresh, username y role."),
            401: OpenApiResponse(description="Email o contraseña inválidos / cuenta bloqueada / inactiva."),
        },
        summary="Iniciar sesión",
        tags=["Autenticación"],
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        user = authenticate(request=request, email=email, password=password)

        if user is None:
            # ModelBackend returns None for inactive users — detect this case
            # before counting it as a failed credential attempt
            try:
                candidate = User.objects.get(email=email)
                if not candidate.is_active and candidate.check_password(password):
                    return Response(
                        {"detail": "inactive"},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
            except User.DoesNotExist:
                pass

            attempt = AccessAttempt.objects.filter(username=email).first()
            failures = attempt.failures_since_start if attempt else 0
            limit = getattr(settings, 'AXES_FAILURE_LIMIT', 5)

            if failures >= limit:
                return Response(
                    {"detail": "lockout"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            return Response(
                {"detail": "invalid", "remaining_attempts": max(0, limit - failures)},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = AuthService.generate_tokens_for_user(user)
        response = Response(data, status=status.HTTP_200_OK)
        _set_refresh_cookie(response, data['refresh'])
        registrar_operacion(user, 'LOGIN', {'email': user.email}, get_client_ip(request))
        return response


# ─────────────────────────────────────────────────────────────────────────────
# Token refresh con soporte de cookie HttpOnly
# ─────────────────────────────────────────────────────────────────────────────

class CookieTokenRefreshView(APIView):
    """
    RF-AUT-03: Renueva el access token.
    Lee el refresh desde el body (tests/Swagger) o desde la cookie HttpOnly (browser).
    Setea el nuevo refresh token en cookie si ROTATE_REFRESH_TOKENS=True.
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        # Body tiene prioridad (backward compat con tests y herramientas de API)
        refresh_token = request.data.get('refresh') or request.COOKIES.get('refresh_token')

        if not refresh_token:
            return Response(
                {'detail': 'Refresh token no proporcionado.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            return Response(
                {"detail": str(exc.args[0])},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response(serializer.validated_data, status=status.HTTP_200_OK)

        # Actualizar cookie si se rotó el refresh token
        if 'refresh' in serializer.validated_data:
            _set_refresh_cookie(response, serializer.validated_data['refresh'])

        return response


# ─────────────────────────────────────────────────────────────────────────────
# Logout
# ─────────────────────────────────────────────────────────────────────────────

class LogoutView(APIView):
    """
    RF-AUT-02: Cierre de sesión.
    Lee el refresh del body o de la cookie, lo blacklistea y limpia la cookie.
    Requiere el header Authorization: Bearer <access_token>.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Cerrar sesión",
        tags=["Autenticación"],
    )
    def post(self, request):
        refresh_token = request.data.get("refresh") or request.COOKIES.get('refresh_token')

        if not refresh_token:
            return Response(
                {"detail": "El campo 'refresh' es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            registrar_operacion(
                request.user, 'LOGOUT', {'email': request.user.email}, get_client_ip(request)
            )
            response = Response(
                {"detail": "Sesión cerrada exitosamente."},
                status=status.HTTP_200_OK,
            )
            _clear_refresh_cookie(response)
            return response
        except TokenError:
            return Response(
                {"detail": "Token inválido o expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )


# ─────────────────────────────────────────────────────────────────────────────
# Cambio de contraseña (item 2.5)
# ─────────────────────────────────────────────────────────────────────────────

class CambiarContrasenaView(APIView):
    """
    Permite al usuario autenticado cambiar su propia contraseña.
    Requiere la contraseña actual, una nueva y su confirmación.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=CambiarContrasenaSerializer,
        responses={
            200: OpenApiResponse(description="Contraseña actualizada correctamente."),
            400: OpenApiResponse(description="Validación fallida (actual incorrecta, no coinciden, débil, etc.)."),
            401: OpenApiResponse(description="No autenticado."),
        },
        summary="Cambiar contraseña del usuario autenticado",
        tags=["Autenticación"],
    )
    def post(self, request):
        serializer = CambiarContrasenaSerializer(
            data=request.data, context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(
            {"detail": "Contraseña actualizada correctamente."},
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Gestión de usuarios (RF-AUT-04) — solo ADMIN
# ─────────────────────────────────────────────────────────────────────────────

class UserViewSet(viewsets.GenericViewSet):
    """
    CRUD de usuarios del sistema. Acceso exclusivo para rol ADMIN.
    Nunca expone contraseñas. PATCH solo permite cambiar el campo `role`.
    """
    permission_classes = [allow_roles('ADMIN')]
    queryset = User.objects.all().order_by('date_joined')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateUserSerializer
        if self.action == 'partial_update':
            return PatchUserSerializer
        return UserSerializer

    @extend_schema(summary="Listar usuarios", tags=["Usuarios"])
    def list(self, request):
        serializer = UserSerializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    @extend_schema(summary="Crear usuario", tags=["Usuarios"])
    def create(self, request):
        serializer = CreateUserSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Editar rol de usuario", tags=["Usuarios"])
    def partial_update(self, request, pk=None):
        user = self.get_object()
        if user == request.user:
            return Response(
                {"detail": "No puedes cambiar tu propio rol."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = PatchUserSerializer(user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(UserSerializer(user).data)

    @extend_schema(summary="Desactivar usuario", tags=["Usuarios"])
    @action(detail=True, methods=['post'], url_path='desactivar')
    def desactivar(self, request, pk=None):
        user = self.get_object()
        if user == request.user:
            return Response(
                {"detail": "No puedes desactivar tu propia cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=['is_active'])
        registrar_operacion(
            request.user,
            'USUARIO_DESACTIVADO',
            {'usuario_desactivado': user.email},
            get_client_ip(request),
        )
        return Response(UserSerializer(user).data)


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────

class HealthView(APIView):
    """Lightweight endpoint for Railway healthchecks — no auth required."""
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)
