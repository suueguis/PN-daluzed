import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import { useApiQuery } from '../../hooks/useApi';
import { produccionAPI } from '../../api/produccionAPI';
import { formatDateTime } from '../../utils/formatters';
import { formatApiError } from '../../utils/formatApiError';

const isValidJSON = (val) => {
  try {
    JSON.parse(val);
    return true;
  } catch {
    return false;
  }
};

const schema = z.object({
  tipo_afectado: z.string().min(1, 'Requerido'),
  id_afectado: z.coerce.number().int().positive('Debe ser un ID positivo'),
  datos_originales: z.string().refine(isValidJSON, { message: 'JSON inválido' }),
  datos_corregidos: z.string().refine(isValidJSON, { message: 'JSON inválido' }),
  descripcion: z.string().min(1, 'Requerida'),
});

const TIPOS = [
  { value: 'Lote', label: 'Lote (MP)' },
  { value: 'Batido', label: 'Batido' },
  { value: 'LotePT', label: 'Lote PT' },
];

export default function CompensatoriosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const { data, isLoading } = useApiQuery(['compensatorios'], '/produccion/compensatorios/');
  const rows = Array.isArray(data) ? data : (data?.results ?? []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setGuardando(true);
    try {
      await produccionAPI.createCompensatorio({
        ...values,
        datos_originales: JSON.parse(values.datos_originales),
        datos_corregidos: JSON.parse(values.datos_corregidos),
      });
      toast.success('Compensatorio registrado');
      qc.invalidateQueries({ queryKey: ['compensatorios'] });
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(formatApiError(err, 'No se pudo registrar el compensatorio'));
    } finally {
      setGuardando(false);
    }
  };

  const columns = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (row) => formatDateTime(row.fecha),
    },
    { key: 'tipo_afectado', header: 'Tipo afectado' },
    { key: 'id_afectado', header: 'ID' },
    {
      key: 'datos_originales',
      header: 'Datos originales',
      render: (row) => (
        <code className="block max-w-xs truncate text-xs text-wine-700">
          {JSON.stringify(row.datos_originales)}
        </code>
      ),
    },
    {
      key: 'datos_corregidos',
      header: 'Datos corregidos',
      render: (row) => (
        <code className="block max-w-xs truncate text-xs text-wine-700">
          {JSON.stringify(row.datos_corregidos)}
        </code>
      ),
    },
    { key: 'descripcion', header: 'Descripción', cellClassName: 'max-w-sm' },
    {
      key: 'usuario',
      header: 'Usuario',
      render: (row) => (row.usuario ? `#${row.usuario}` : '—'),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-wine-900">Compensatorios</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} /> Nuevo compensatorio
        </Button>
      </div>

      <Table
        columns={columns}
        data={rows}
        loading={isLoading}
        getRowKey={(r) => r.id}
        emptyTitle="Sin compensatorios"
        emptyDescription="No se han registrado movimientos compensatorios."
      />

      <Modal
        open={open}
        onClose={() => !guardando && setOpen(false)}
        title="Nuevo compensatorio"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" form="compensatorio-form" disabled={guardando}>
              {guardando ? <Spinner size="sm" /> : null}
              Guardar
            </Button>
          </>
        }
      >
        <form id="compensatorio-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Tipo afectado"
              placeholder="Selecciona..."
              options={TIPOS}
              error={errors.tipo_afectado?.message}
              {...register('tipo_afectado')}
            />
            <Input
              label="ID afectado"
              type="number"
              min="1"
              error={errors.id_afectado?.message}
              {...register('id_afectado')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-wine-700 uppercase tracking-wide">
              Datos originales (JSON)
            </label>
            <textarea
              rows={3}
              placeholder='{"cantidad": 10}'
              className="rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-300"
              {...register('datos_originales')}
            />
            {errors.datos_originales && (
              <span className="text-xs text-cherry-500">{errors.datos_originales.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-wine-700 uppercase tracking-wide">
              Datos corregidos (JSON)
            </label>
            <textarea
              rows={3}
              placeholder='{"cantidad": 8}'
              className="rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-300"
              {...register('datos_corregidos')}
            />
            {errors.datos_corregidos && (
              <span className="text-xs text-cherry-500">{errors.datos_corregidos.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-wine-700 uppercase tracking-wide">
              Descripción
            </label>
            <textarea
              rows={2}
              placeholder="Motivo del ajuste..."
              className="rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              {...register('descripcion')}
            />
            {errors.descripcion && (
              <span className="text-xs text-cherry-500">{errors.descripcion.message}</span>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
