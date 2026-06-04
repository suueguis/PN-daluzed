import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Truck, Star } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import { useApiQuery } from '../../hooks/useApi';
import { produccionAPI } from '../../api/produccionAPI';
import { formatApiError } from '../../utils/formatApiError';
import { formatDate } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export default function DespachosPage() {
  const qc = useQueryClient();
  const [confirmar, setConfirmar] = useState(null);
  const [despachando, setDespachando] = useState(false);
  const [fifoActivo, setFifoActivo] = useState(false);

  const { data, isLoading } = useApiQuery(['despachos'], '/produccion/despachos/');

  const enEspera = useMemo(() => {
    const rows = Array.isArray(data) ? data : (data?.results ?? []);
    return rows.filter((l) => l.estado === 'EN_ESPERA');
  }, [data]);

  const fifoId = useMemo(() => {
    if (!enEspera.length) return null;
    return [...enEspera].sort(
      (a, b) => new Date(a.fecha_produccion) - new Date(b.fecha_produccion),
    )[0].id;
  }, [enEspera]);

  const handleDespachar = async () => {
    if (!confirmar) return;
    setDespachando(true);
    try {
      await produccionAPI.despacharLote(confirmar.id);
      toast.success(`Lote #${confirmar.id} despachado`);
      qc.invalidateQueries({ queryKey: ['despachos'] });
    } catch (err) {
      toast.error(formatApiError(err, 'No se pudo despachar el lote'));
    } finally {
      setDespachando(false);
      setConfirmar(null);
    }
  };

  const columns = [
    {
      key: 'id',
      header: '#',
      cellClassName: 'w-12 font-mono text-xs text-wine-700',
      render: (row) => (
        <span className="flex items-center gap-1">
          {row.id}
          {fifoActivo && row.id === fifoId && (
            <Star size={12} className="text-butter-200 fill-butter-200" aria-label="FIFO" />
          )}
        </span>
      ),
    },
    {
      key: 'batido',
      header: 'Batido',
      render: (row) => `Batido #${row.batido}`,
    },
    {
      key: 'cantidad',
      header: 'Cantidad',
      render: (row) => Number(row.cantidad).toFixed(2),
    },
    {
      key: 'fecha_produccion',
      header: 'Fecha producción',
      render: (row) => formatDate(row.fecha_produccion),
    },
    {
      key: 'dias_espera',
      header: 'Días en espera',
      render: (row) => {
        const dias = differenceInDays(new Date(), new Date(row.fecha_produccion));
        return (
          <span className={cn(dias > 3 ? 'font-semibold text-cherry-500' : 'text-wine-700')}>
            {dias}d
          </span>
        );
      },
    },
    {
      key: 'accion',
      header: 'Acción',
      render: (row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setConfirmar(row)}
          disabled={row.estado !== 'EN_ESPERA'}
        >
          <Truck size={13} /> Despachar
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-wine-900">Lotes en espera</h2>
        <Button
          size="sm"
          variant={fifoActivo ? 'primary' : 'secondary'}
          onClick={() => setFifoActivo((v) => !v)}
        >
          <Star size={13} /> Aplicar FIFO
        </Button>
      </div>

      <Table
        columns={columns}
        data={enEspera}
        loading={isLoading}
        getRowKey={(r) => r.id}
        emptyTitle="Sin lotes en espera"
        emptyDescription="Todos los lotes han sido despachados."
      />

      <Modal
        open={!!confirmar}
        onClose={() => !despachando && setConfirmar(null)}
        title="Confirmar despacho"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(null)} disabled={despachando}>
              Cancelar
            </Button>
            <Button onClick={handleDespachar} disabled={despachando}>
              {despachando ? 'Despachando…' : 'Confirmar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-wine-700">
          ¿Despachar el lote <strong>#{confirmar?.id}</strong>? Esta acción es irreversible.
        </p>
      </Modal>
    </div>
  );
}
