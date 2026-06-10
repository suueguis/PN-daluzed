# apps/authentication/api/v1/serializers.py
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'role', 'is_active', 'date_joined']
        read_only_fields = ['id', 'email', 'is_active', 'date_joined']


class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'role']

    def validate_password(self, value: str) -> str:
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data: dict) -> User:
        return User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'INVENTARIO'),
        )


class PatchUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['role', 'is_active']


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class CambiarContrasenaSerializer(serializers.Serializer):
    contrasena_actual = serializers.CharField(write_only=True)
    nueva_contrasena = serializers.CharField(write_only=True)
    confirmar_contrasena = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['nueva_contrasena'] != attrs['confirmar_contrasena']:
            raise serializers.ValidationError(
                {'confirmar_contrasena': 'Las contraseñas no coinciden.'}
            )

        user = self.context['request'].user
        if not user.check_password(attrs['contrasena_actual']):
            raise serializers.ValidationError(
                {'contrasena_actual': 'La contraseña actual es incorrecta.'}
            )

        if attrs['nueva_contrasena'] == attrs['contrasena_actual']:
            raise serializers.ValidationError(
                {'nueva_contrasena': 'La nueva contraseña debe ser distinta de la actual.'}
            )

        try:
            validate_password(attrs['nueva_contrasena'], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'nueva_contrasena': list(exc.messages)})

        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['nueva_contrasena'])
        user.save(update_fields=['password'])
        return user