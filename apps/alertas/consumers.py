"""Consumers WebSocket de alertas (RF-ALR-05)."""
import json

from channels.generic.websocket import AsyncWebsocketConsumer


class AlertasConsumer(AsyncWebsocketConsumer):
    """Suscribe a los clientes conectados al grupo ``alertas``."""

    GROUP_NAME = 'alertas'

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)

    async def alerta_nueva(self, event):
        """Handler para mensajes ``{'type': 'alerta.nueva', ...}``."""
        await self.send(text_data=json.dumps(event))
