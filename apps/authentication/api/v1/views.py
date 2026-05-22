# apps/authentication/api/v1/views.py
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from drf_spectacular.utils import extend_schema, OpenApiResponse
from axes.models import AccessAttempt

from .serializers import LoginSerializer
from apps.authentication.services import AuthService

User = get_user_model()


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