# WebSocket Protocol — Daluzed Alertas en Tiempo Real

Implementación del requisito RF-ALR-05.

---

## Servidor

- **Stack**: Django Channels 4.x + Daphne ASGI
- **Capa de canales**: `InMemoryChannelLayer` — funciona en single-container Railway
- **Limitación de escala**: no funciona con múltiples réplicas del mismo servicio. Cada proceso tiene su propia capa en memoria. Para escalar horizontalmente se requiere migrar a `channels_redis.core.RedisChannelLayer`.

---

## URL de conexión

| Entorno | URL |
|---------|-----|
| Desarrollo | `ws://localhost:8000/ws/alertas/` |
| Producción | `wss://pn-daluzed-production.up.railway.app/ws/alertas/` |

El frontend construye la URL desde `VITE_API_URL`:
```js
// alertasStore.js
const wsUrl = buildWsUrl()  // reemplaza http(s):// por ws(s)://
```
Si `VITE_API_URL` no está definida, `alertasStore.js` usa `window.location.host` — esto apunta al frontend Vercel en vez del backend Railway, causando falla de conexión.

---

## Ciclo de vida de la conexión

```
Cliente                          Servidor (AlertasConsumer)
  |                                    |
  |── WebSocket connect ──────────────►|
  |                           group_add('alertas', channel_name)
  |                           accept()
  |◄────────────────── 101 Switching ──|
  |                                    |
  |     [conexión activa]              |
  |                                    |
  |◄── alerta.nueva event ─────────────| (broadcast a todos en el grupo)
  |                                    |
  |── close / disconnect ─────────────►|
  |                          group_discard('alertas', channel_name)
```

No hay autenticación WebSocket implementada actualmente — cualquier cliente puede conectarse.
El servidor no envía mensajes al conectar (no hay `initial state push`).

---

## Grupo de canales

Todos los clientes conectados se unen al mismo grupo:

```python
GROUP_NAME = 'alertas'
```

Un mensaje publicado en este grupo se retransmite a **todos los clientes conectados** simultáneamente.

---

## Formato de mensaje

### Servidor → Cliente

Los mensajes son JSON. El tipo de evento de Channels es `alerta.nueva` (con punto, que Channels convierte al handler `alerta_nueva`).

```json
{
  "type": "alerta.nueva",
  "tipo": "STOCK_BAJO",
  "mensaje": "Harina: stock 20 kg por debajo del punto de reorden (50 kg)",
  "alerta_id": 42
}
```

Valores posibles de `tipo`:

| Valor | Descripción |
|-------|-------------|
| `STOCK_BAJO` | Stock de materia prima en Bodega Principal cayó bajo `punto_reorden` |
| `VENCIMIENTO_PROXIMO` | Lote con fecha de vencimiento dentro del umbral configurado (default 7 días) |
| `EN_ESPERA_PENDIENTE` | Lote de producto terminado lleva más de N horas en estado `EN_ESPERA` |

### Cliente → Servidor

No implementado. El consumer descarta mensajes recibidos del cliente (no hay handler para `receive`).

---

## Cómo se publican los mensajes

Las alertas se generan y publican automáticamente. La cadena es:

```
Lote.save()
  └─► signals.py :: post_save handler
       └─► AlertaService.verificar_stock_reorden(mp)
            └─► Alerta.objects.create(...)
                 └─► AlertaService.notificar_todos(alerta)
                      └─► AlertaService._enviar_websocket(alerta)  [privado]
                           └─► channel_layer.group_send('alertas', {
                                 "type": "alerta.nueva",
                                 "tipo": alerta.tipo,
                                 "mensaje": alerta.mensaje,
                                 "alerta_id": alerta.id,
                               })
```

También se puede llamar manualmente desde views:
```python
from apps.alertas.services import AlertaService
AlertaService.notificar_todos(alerta)
```

---

## Configuración ASGI

`core/asgi.py` usa `ProtocolTypeRouter`:

```python
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": URLRouter([
        path("ws/alertas/", AlertasConsumer.as_asgi()),
    ]),
})
```

El servidor Daphne inicia en el `Dockerfile` con:
```
daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

---

## Frontend — alertasStore.js (Zustand)

El store:
1. Construye la URL WebSocket desde `VITE_API_URL`
2. Abre la conexión en `connect()`
3. Al recibir `alerta.nueva`, agrega la alerta a la lista en el store
4. Expone `alertas[]`, `connect()`, `disconnect()`

Los componentes de React suscritos al store se re-renderizan automáticamente al llegar nuevas alertas.

---

## Paths de migración

Si se necesita escalar a múltiples réplicas Railway, reemplazar en `core/settings.py`:

```python
# Actual (single container)
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}

# Para múltiples réplicas (requiere Redis)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [("redis", 6379)]},
    }
}
```

También agregar `channels_redis` a `requirements.txt` y provisionar un servicio Redis en Railway.
