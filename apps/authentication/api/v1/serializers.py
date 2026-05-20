# apps/authentication/api/v1/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.conf import settings
from axes.models import AccessAttempt


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        request = self.context.get('request')

        if not email or not password:
            raise serializers.ValidationError(
                {"detail": "Debe incluir email y contraseña."}
            )

        user = authenticate(request=request, email=email, password=password)

        if user is None:
            # CORRECCIÓN: el campo se llama 'failures_since_start', no 'failures'
            attempt = AccessAttempt.objects.filter(username=email).first()
            failures = attempt.failures_since_start if attempt else 0

            limit = getattr(settings, 'AXES_FAILURE_LIMIT', 5)
            remaining = max(0, limit - failures)

            if failures >= limit:
                raise serializers.ValidationError({"detail": "lockout"})

            raise serializers.ValidationError({
                "detail": "invalid",
                "remaining_attempts": remaining,
            })

        if not user.is_active:
            raise serializers.ValidationError({"detail": "inactive"})

        return user