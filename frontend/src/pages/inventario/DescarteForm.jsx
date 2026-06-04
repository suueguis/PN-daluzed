import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useCreateDescarte } from '../../hooks/inventario/useInventario';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDecimal, formatDate } from '../../utils/formatters';

const schema = z.object({
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres'),
});

export default function DescarteForm({ lote, onSuccess, onCancel }) {
  const { register, handleSubmit, getValues, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { motivo: '' },
  });
  const [confirmOpen, setConfirmOpen] = useState(false);

  const createMut = useCreateDescarte();
  const loteCode = lote.numero_lote || `#${lote.id}`;

  function onSubmit() {
    setConfirmOpen(true);
  }

  async function actuallyDescarte() {
    try {
      await createMut.mutateAsync({
        lote_id: lote.id,
        motivo: getValues('motivo'),
      });
      toast.success('Descarte registrado');
      setConfirmOpen(false);
      onSuccess?.();
    } catch (err) {
      const msg = err?.response?.data?.detail ?? 'Error al registrar el descarte';
      toast.error(msg);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-xl bg-cream-100 p-3 text-sm text-wine-900">
        <p><strong>Lote:</strong> {lote.numero_lote || `#${lote.id}`}</p>
        <p><strong>MP:</strong> {lote.materia_prima_nombre}</p>
        <p><strong>Cantidad:</strong> {formatDecimal(lote.cantidad)}</p>
        <p><strong>Vencimiento:</strong> {formatDate(lote.fecha_vencimiento)}</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-wine-700">
          Motivo del Descarte
        </label>
        <textarea
          {...register('motivo')}
          rows={3}
          placeholder="Describe el motivo del descarte…"
          className="rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        {errors.motivo && <span className="text-xs text-cherry-500">{errors.motivo.message}</span>}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="secondary" type="button" onClick={onCancel}>Cancelar</Button>
        )}
        <Button variant="danger" type="submit" disabled={createMut.isPending}>
          {createMut.isPending ? 'Registrando…' : 'Confirmar Descarte'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={actuallyDescarte}
        title="Descartar lote"
        description={`El lote ${loteCode} (${formatDecimal(lote.cantidad)}) quedará descartado. Esta acción no se puede deshacer.`}
        confirmWord={loteCode}
        confirmLabel="Descartar lote"
        loading={createMut.isPending}
      />
    </form>
  );
}
