# apps/authentication/api/v1/serializers.py
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)