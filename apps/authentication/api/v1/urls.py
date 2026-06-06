# apps/authentication/api/v1/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView,
    LogoutView,
    CookieTokenRefreshView,
    CambiarContrasenaView,
    UserViewSet,
    HealthView,
)

router = DefaultRouter()
router.register('usuarios', UserViewSet, basename='usuario')

urlpatterns = [
    path("login/",              LoginView.as_view(),              name="login_v1"),
    path("logout/",             LogoutView.as_view(),             name="logout_v1"),
    path("token/refresh/",      CookieTokenRefreshView.as_view(), name="token_refresh_v1"),
    path("cambiar-contrasena/", CambiarContrasenaView.as_view(),  name="cambiar_contrasena_v1"),
    path("health/",             HealthView.as_view(),             name="health_v1"),
    path("",                    include(router.urls)),
]