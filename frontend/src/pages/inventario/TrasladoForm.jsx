import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useFefo, useBodegas, useCreateTraslado } from '../../hooks/inventario/useInventario';
import { useApiQuery } from '../../hooks/useApi';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { formatDate, formatDecimal } from '../../utils/formatters';
import { formatApiError } from '../../utils/formatApiError';

const schema = z.object({
  materia_prima: z.string().min(1, 'Selecciona una materia prima'),
  lote_id: z.string().min(1, 'Selecciona un lote'),
  bodega_destino: z.string().min(1, 'Selecciona bodega destino'),
  cantidad: z.string()
    .min(1, 'Ingresa una cantidad')
    .refine((v) => Number.isNaN(Number.parseFloat(v)) === false && Number.parseFloat(v) > 0, 'Debe ser mayor a 0'),
  notas: z.string().optional(),
});

export default function TrasladoForm({ defaultMpId, onSuccess, onCancel }) {
  const { register, handleSubmit, control, setValue, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { materia_prima: defaultMpId ?? '', lote_id: '', bodega_destino: '', cantidad: '', notas: '' },
  });

  const mpSeleccionada = useWatch({ control, name: 'materia_prima' });
  const loteSeleccionado = useWatch({ control, name: 'lote_id' });

  const { data: mps = [] } = useApiQuery(['catalogo', 'materias-primas'], '/catalogo/materias-primas/');
  const { data: bodegas = [] } = useBodegas();
  const { data: fefo, isLoading: loadingFefo } = useFefo(
    { materia_prima: mpSeleccionada || undefined },
    !!mpSeleccionada,
  );
  const createMut = useCreateTraslado();

  // Mostrar todas las bodegas como destino (no solo PDP)
  const bodegasDestino = bodegas;

  // Auto-select FEFO suggestion
  useEffect(() => {
    if (fefo?.lote_sugerido) {
      setValue('lote_id', String(fefo.lote_sugerido.id));
    } else {
      setValue('lote_id', '');
    }
  }, [fefo, setValue]);

  const loteActual = fefo?.lotes?.find((l) => String(l.id) === loteSeleccionado);
  const maxCantidad = loteActual ? Number.parseFloat(loteActual.cantidad) : undefined;

  async function onSubmit(values) {
    if (maxCantidad !== undefined && Number.parseFloat(values.cantidad) > maxCantidad) {
      toast.error(`La cantidad no puede superar ${formatDecimal(maxCantidad)}`);
      return;
    }
    try {
      await createMut.mutateAsync({
        lote_id: Number.parseInt(values.lote_id, 10),
        bodega_destino: Number.parseInt(values.bodega_destino, 10),
        cantidad: Number.parseFloat(values.cantidad),
        notas: values.notas || '',
      });
      toast.success('Traslado registrado');
      reset({ materia_prima: defaultMpId ?? '', lote_id: '', bodega_destino: '', cantidad: '', notas: '' });
      onSuccess?.();
    } catch (err) {
      toast.error(formatApiError(err, 'No se pudo registrar el traslado'));
    }
  }

  const mpOptions = mps.map((m) => ({ value: String(m.id), label: m.nombre }));
  const bodegaOptions = bodegasDestino.map((b) => ({
    value: String(b.id),
    label: `${b.nombre} (${b.tipo})`,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Materia Prima"
        options={mpOptions}
        placeholder="Selecciona materia prima…"
        {...register('materia_prima')}
        error={errors.materia_prima?.message}
      />

      {mpSeleccionada && (
        <>
          {loadingFefo ? (
            <div className="flex items-center gap-2 text-sm text-wine-700">
              <Spinner size="sm" /> Cargando lotes disponibles…
            </div>
          ) : (
            <div>
              <div className="mb-1 flex items-center gap-2">
                <label htmlFor="traslado-lote" className="text-xs font-semibold uppercase tracking-wide text-wine-700">
                  Lote origen
                </label>
                {fefo?.lote_sugerido && (
                  <Badge tone="info">Sugerencia FEFO</Badge>
                )}
              </div>
              {fefo?.lotes?.length ? (
                <select
                  id="traslado-lote"
                  {...register('lote_id')}
                  className="w-full rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                >

                  <option value="" disabled>Selecciona lote…</option>
                  {fefo.lotes.map((l) => (
                    <option key={l.id} value={String(l.id)}>
                      {l.id === fefo.lote_sugerido?.id ? '★ ' : ''}
                      {l.numero_lote || `#${l.id}`} — {l.bodega_nombre} — {formatDecimal(l.cantidad)} — vence {formatDate(l.fecha_vencimiento)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-wine-700">Sin lotes disponibles para esta materia prima.</p>
              )}
              {errors.lote_id && (
                <span className="text-xs text-cherry-500">{errors.lote_id.message}</span>
              )}
              {loteActual && (
                <p className="mt-1 text-xs text-wine-700">
                  Disponible: <strong>{formatDecimal(loteActual.cantidad)}</strong>
                  {loteActual.bodega_nombre && <span className="ml-2 text-wine-600">({loteActual.bodega_nombre})</span>}
                </p>
              )}
            </div>
          )}

          <Select
            label="Bodega Destino"
            options={bodegaOptions}
            placeholder="Selecciona bodega destino…"
            {...register('bodega_destino')}
            error={errors.bodega_destino?.message}
          />

          <Input
            label="Cantidad a trasladar"
            type="number"
            step="0.01"
            min="0.01"
            max={maxCantidad}
            {...register('cantidad')}
            error={errors.cantidad?.message}
            placeholder="ej. 250.00"
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="traslado-notas" className="text-xs font-semibold uppercase tracking-wide text-wine-700">
              Notas <span className="font-normal normal-case text-wine-600">(opcional)</span>
            </label>
            <textarea
              id="traslado-notas"
              rows={2}
              placeholder="Motivo del traslado o instrucciones adicionales…"
              className="rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              {...register('notas')}
            />
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button variant="secondary" type="button" onClick={onCancel}>Cancelar</Button>
        )}
        <Button type="submit" disabled={createMut.isPending || !mpSeleccionada}>
          {createMut.isPending ? 'Registrando…' : 'Registrar Traslado'}
        </Button>
      </div>
    </form>
  );
}
