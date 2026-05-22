# apps/authentication/api/v1/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .serializers import LoginSerializer
from apps.authentication.services import AuthService


class LoginView(APIView):
    """
    RF-AUT-01: Autenticación por email y contraseña con protección Axes.
    Devuelve access token, refresh token, username (email) y rol del usuario.
    """
    permission_classes = []
    authentication_classes = []

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: OpenApiResponse(description="Login exitoso. Retorna access, refresh, username y role."),
            400: OpenApiResponse(description="Email o contraseña inválidos / cuenta bloqueada."),
        },
        summary="Iniciar sesión",
        tags=["Autenticación"],
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})

        if not serializer.is_valid():
            errors = serializer.errors
            # validate() raises ValidationError with a dict keyed by 'detail';
            # DRF passes dicts through as-is (no non_field_errors wrapping),
            # so check for our key directly and return 401 for auth errors.
            if 'detail' in errors:
                return Response(errors, status=status.HTTP_401_UNAUTHORIZED)
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data
        data = AuthService.generate_tokens_for_user(user)
        return Response(data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    RF-AUT-03: Cierre de sesión. Invalida el refresh token en la blacklist.
    Requiere el header Authorization: Bearer <access_token>.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Cerrar sesión",
        tags=["Autenticación"],
    )
    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "El campo 'refresh' es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"detail": "Sesión cerrada exitosamente."},
                status=status.HTTP_200_OK,
            )
        except TokenError:
            return Response(
                {"detail": "Token inválido o expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )