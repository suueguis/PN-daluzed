import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

const schema = z.object({
  materia_prima: z.string().min(1, 'Selecciona una materia prima'),
  lote_id: z.string().min(1, 'Selecciona un lote'),
  bodega_destino: z.string().min(1, 'Selecciona bodega destino'),
  cantidad: z.string()
    .min(1, 'Ingresa una cantidad')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Debe ser mayor a 0'),
});

export default function TrasladoForm({ defaultMpId, onSuccess, onCancel }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { materia_prima: defaultMpId ?? '', lote_id: '', bodega_destino: '', cantidad: '' },
  });

  const mpSeleccionada = watch('materia_prima');
  const loteSeleccionado = watch('lote_id');

  const { data: mps = [] } = useApiQuery(['catalogo', 'materias-primas'], '/catalogo/materias-primas/');
  const { data: bodegas = [] } = useBodegas();
  const { data: fefo, isLoading: loadingFefo } = useFefo(
    { materia_prima: mpSeleccionada || undefined },
    !!mpSeleccionada,
  );
  const createMut = useCreateTraslado();

  const pdpBodegas = bodegas.filter((b) => b.tipo === 'PDP');

  // Auto-select FEFO suggestion
  useEffect(() => {
    if (fefo?.lote_sugerido) {
      setValue('lote_id', String(fefo.lote_sugerido.id));
    } else {
      setValue('lote_id', '');
    }
  }, [fefo, setValue]);

  const loteActual = fefo?.lotes?.find((l) => String(l.id) === loteSeleccionado);
  const maxCantidad = loteActual ? parseFloat(loteActual.cantidad) : undefined;

  async function onSubmit(values) {
    if (maxCantidad !== undefined && parseFloat(values.cantidad) > maxCantidad) {
      toast.error(`La cantidad no puede superar ${formatDecimal(maxCantidad)}`);
      return;
    }
    try {
      await createMut.mutateAsync({
        lote_id: parseInt(values.lote_id, 10),
        bodega_destino: parseInt(values.bodega_destino, 10),
        cantidad: parseFloat(values.cantidad),
      });
      toast.success('Traslado registrado');
      onSuccess?.();
    } catch (err) {
      const msg = err?.response?.data?.detail ?? 'Error al registrar el traslado';
      toast.error(msg);
    }
  }

  const mpOptions = mps.map((m) => ({ value: String(m.id), label: m.nombre }));

  const loteOptions = fefo?.lotes?.map((l) => ({
    value: String(l.id),
    label: `${l.numero_lote || `#${l.id}`} — ${formatDecimal(l.cantidad)} — vence ${formatDate(l.fecha_vencimiento)}`,
  })) ?? [];

  const pdpOptions = pdpBodegas.map((b) => ({ value: String(b.id), label: b.nombre }));

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
              <Spinner size="sm" /> Cargando sugerencia FEFO…
            </div>
          ) : (
            <div>
              <div className="mb-1 flex items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-wine-700">
                  Lote
                </label>
                {fefo?.lote_sugerido && (
                  <Badge tone="info">Sugerencia FEFO</Badge>
                )}
              </div>
              {loteOptions.length === 0 ? (
                <p className="text-sm text-wine-700">Sin lotes disponibles para esta MP.</p>
              ) : (
                <select
                  {...register('lote_id')}
                  className="w-full rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  <option value="" disabled>Selecciona lote…</option>
                  {fefo?.lotes?.map((l) => (
                    <option key={l.id} value={String(l.id)}>
                      {l.id === fefo.lote_sugerido?.id ? '★ ' : ''}
                      {l.numero_lote || `#${l.id}`} — {formatDecimal(l.cantidad)} — vence {formatDate(l.fecha_vencimiento)}
                    </option>
                  ))}
                </select>
              )}
              {errors.lote_id && (
                <span className="text-xs text-cherry-500">{errors.lote_id.message}</span>
              )}
              {loteActual && (
                <p className="mt-1 text-xs text-wine-700">
                  Disponible: <strong>{formatDecimal(loteActual.cantidad)}</strong>
                </p>
              )}
            </div>
          )}

          <Select
            label="Bodega Destino"
            options={pdpOptions}
            placeholder="Selecciona bodega destino…"
            {...register('bodega_destino')}
            error={errors.bodega_destino?.message}
          />

          <Input
            label="Cantidad"
            type="number"
            step="0.01"
            min="0.01"
            max={maxCantidad}
            {...register('cantidad')}
            error={errors.cantidad?.message}
            placeholder="ej. 250.00"
          />
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
