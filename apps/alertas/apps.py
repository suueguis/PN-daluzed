from django.apps import AppConfig


class AlertasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.alertas'
    verbose_name = 'Alertas y Notificaciones'

    def ready(self) -> None:
        import apps.alertas.signals  # noqa: F401
