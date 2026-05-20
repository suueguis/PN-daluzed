# apps/authentication/api/v1/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, LogoutView

urlpatterns = [
    path("login/",         LoginView.as_view(),    name="login_v1"),
    path("logout/",        LogoutView.as_view(),   name="logout_v1"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh_v1"),
]