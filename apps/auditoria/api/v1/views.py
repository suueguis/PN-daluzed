from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.authentication.permissions import allow_roles
from apps.auditoria.models import BitacoraOperacion


class BitacoraView(APIView):
    permission_classes = [allow_roles('ADMIN')]

    def get(self, request):
        qs = BitacoraOperacion.objects.select_related('usuario').all()

        usuario_id = request.query_params.get('usuario')
        accion = request.query_params.get('accion')
        desde = request.query_params.get('desde')
        hasta = request.query_params.get('hasta')

        if usuario_id:
            qs = qs.filter(usuario_id=usuario_id)
        if accion:
            qs = qs.filter(accion=accion)
        if desde:
            qs = qs.filter(fecha__date__gte=desde)
        if hasta:
            qs = qs.filter(fecha__date__lte=hasta)

        data = [
            {
                'id':       entry.id,
                'usuario':  entry.usuario.email if entry.usuario else None,
                'accion':   entry.accion,
                'detalle':  entry.detalle,
                'ip':       entry.ip,
                'fecha':    entry.fecha.isoformat(),
            }
            for entry in qs[:500]
        ]
        return Response({'bitacora': data, 'total': len(data)})
