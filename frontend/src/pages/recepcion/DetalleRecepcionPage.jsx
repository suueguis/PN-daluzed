import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { recepcionesAPI } from '../../api/recepcionAPI';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-wine-700">{label}</dt>
      <dd className="mt-0.5 text-sm text-wine-900">{value ?? '—'}</dd>
    </div>
  );
}

export default function DetalleRecepcionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: recepcion, isLoading, isError } = useQuery({
    queryKey: ['recepcion', 'detalle', id],
    queryFn:  () => recepcionesAPI.get(id).then((r) => r.data),
    enabled:  !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !recepcion) {
    return (
      <div className="rounded-2xl border border-cherry-500/30 bg-white p-6 text-center text-sm text-wine-700">
        No se pudo cargar la recepción.
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 print:max-w-full">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Volver</Button>
          <h2 className="font-crushed text-2xl text-wine-900">Recepción REC-{recepcion.id}</h2>
        </div>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>

      <div className="rounded-2xl border border-peach-200 bg-white p-5">
        <h3 className="mb-4 font-semibold text-wine-900">Cabecera</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="# Recepción"   value={`REC-${recepcion.id}`} />
          <Field label="Orden de compra" value={`OC-${recepcion.orden_compra}`} />
          <Field label="Fecha"          value={recepcion.fecha} />
          <Field label="Usuario"        value={recepcion.usuario} />
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-wine-700">Estado</dt>
            <dd className="mt-0.5">
              <Badge tone={recepcion.confirmada ? 'success' : 'warning'}>
                {recepcion.confirmada ? 'Confirmada' : 'Pendiente'}
              </Badge>
            </dd>
          </div>
          {recepcion.justificacion_vencimiento && (
            <div className="sm:col-span-2">
              <Field
                label="Justificación de vencimiento"
                value={recepcion.justificacion_vencimiento}
              />
            </div>
          )}
        </dl>
      </div>

      <p className="text-xs text-wine-700/60 print:hidden">
        Esta recepción es inmutable. Para correcciones utiliza un compensatorio.
      </p>
    </div>
  );
}
