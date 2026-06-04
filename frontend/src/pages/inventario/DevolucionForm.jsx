import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useCreateDevolucion } from '../../hooks/inventario/useInventario';
import { useApiQuery } from '../../hooks/useApi';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { formatDecimal, formatDate } from '../../utils/formatters';
import { formatApiError } from '../../utils/formatApiError';

const schema = z.object({
  proveedor_id: z.string().min(1, 'Selecciona un proveedor'),
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres'),
});

export default function DevolucionForm({ lote, onSuccess, onCancel }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { proveedor_id: '', motivo: '' },
  });

  const { data: proveedores = [] } = useApiQuery(['catalogo', 'proveedores'], '/catalogo/proveedores/');
  const createMut = useCreateDevolucion();

  async function onSubmit(values) {
    try {
      await createMut.mutateAsync({
        lote_id: lote.id,
        proveedor_id: parseInt(values.proveedor_id, 10),
        motivo: values.motivo,
      });
      toast.success('Devolución registrada');
      onSuccess?.();
    } catch (err) {
      toast.error(formatApiError(err, 'No se pudo registrar la devolución'));
    }
  }

  const proveedorOptions = proveedores.map((p) => ({ value: String(p.id), label: p.nombre }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-xl bg-cream-100 p-3 text-sm text-wine-900">
        <p><strong>Lote:</strong> {lote.numero_lote || `#${lote.id}`}</p>
        <p><strong>MP:</strong> {lote.materia_prima_nombre}</p>
        <p><strong>Cantidad actual:</strong> {formatDecimal(lote.cantidad)}</p>
        <p><strong>Vencimiento:</strong> {formatDate(lote.fecha_vencimiento)}</p>
      </div>

      <Select
        label="Proveedor"
        options={proveedorOptions}
        placeholder="Selecciona proveedor…"
        {...register('proveedor_id')}
        error={errors.proveedor_id?.message}
      />

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-wine-700">
          Motivo
        </label>
        <textarea
          {...register('motivo')}
          rows={3}
          placeholder="Describe el motivo de la devolución…"
          className="rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        {errors.motivo && <span className="text-xs text-cherry-500">{errors.motivo.message}</span>}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="secondary" type="button" onClick={onCancel}>Cancelar</Button>
        )}
        <Button type="submit" disabled={createMut.isPending}>
          {createMut.isPending ? 'Registrando…' : 'Registrar Devolución'}
        </Button>
      </div>
    </form>
  );
}
