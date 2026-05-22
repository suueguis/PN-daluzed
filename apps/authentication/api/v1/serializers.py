# apps/authentication/api/v1/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate, get_user_model
from django.conf import settings
from axes.models import AccessAttempt

User = get_user_model()


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
            # ModelBackend returns None for inactive users — detect this case
            # before counting it as a failed credential attempt
            try:
                candidate = User.objects.get(email=email)
                if not candidate.is_active and candidate.check_password(password):
                    raise serializers.ValidationError({"detail": "inactive"})
            except User.DoesNotExist:
                pass

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

        return user