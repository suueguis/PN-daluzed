import { useState } from 'react';
import { useLotes } from '../../hooks/inventario/useInventario';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import DescarteForm from './DescarteForm';
import { formatDecimal, formatDate } from '../../utils/formatters';

export default function DescartesPage() {
  const [loteId, setLoteId] = useState('');
  const { data: lotes = [], isLoading } = useLotes();

  const loteOptions = [
    { value: '', label: 'Selecciona un lote' },
    ...lotes.map((l) => ({
      value: String(l.id),
      label: `${l.materia_prima_nombre} — ${l.numero_lote || `#${l.id}`} — ${formatDecimal(l.cantidad)} — vence ${formatDate(l.fecha_vencimiento)}`,
    })),
  ];

  const loteSeleccionado = lotes.find((l) => String(l.id) === loteId);

  if (isLoading) {
    return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;
  }

  if (lotes.length === 0) {
    return <EmptyState title="Sin lotes disponibles" description="No hay lotes con stock para descartar." />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-peach-200 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-wine-900">Registrar Descarte</h2>

        <div className="mb-4">
          <Select
            label="Lote a Descartar"
            options={loteOptions}
            value={loteId}
            placeholder="Selecciona lote…"
            onChange={(e) => setLoteId(e.target.value)}
          />
        </div>

        {loteSeleccionado && (
          <DescarteForm
            lote={loteSeleccionado}
            onSuccess={() => setLoteId('')}
          />
        )}
      </div>
    </div>
  );
}
