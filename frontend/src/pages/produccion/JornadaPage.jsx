import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { useApiQuery } from '../../hooks/useApi';
import { formatDate } from '../../utils/formatters';

function StatCard({ label, value, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-white border-peach-200',
    success: 'bg-mint-200 border-mint-200',
    info: 'bg-peach-200 border-peach-200',
  };
  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-wine-700">{label}</p>
      <p className="mt-1 text-3xl font-bold text-wine-900">{value ?? '—'}</p>
    </div>
  );
}

export default function JornadaPage() {
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: jornada, isLoading: loadingJornada } = useApiQuery(
    ['jornada', fecha],
    '/produccion/jornadas/',
    { params: { fecha } },
  );

  const { data: batidosData, isLoading: loadingBatidos } = useApiQuery(
    ['batidos', fecha],
    '/produccion/batidos/',
    { params: { fecha_produccion: fecha } },
  );

  const batidos = Array.isArray(batidosData) ? batidosData : (batidosData?.results ?? []);

  const columns = [
    { key: 'id', header: '#', cellClassName: 'font-mono text-xs text-wine-700' },
    {
      key: 'producto_terminado',
      header: 'Producto',
      render: (row) => `Prod. #${row.producto_terminado}`,
    },
    { key: 'hora_inicio', header: 'Hora inicio' },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => <Badge state={row.estado} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays size={20} className="text-wine-700" />
        <Input
          label="Fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
      </div>

      {loadingJornada ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total batidos" value={jornada?.total_batidos} />
          <StatCard label="Completados" value={jornada?.batidos_completados} tone="success" />
          <StatCard label="En proceso" value={jornada?.batidos_en_proceso} tone="info" />
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-semibold text-wine-900">Batidos del día</h3>
        <Table
          columns={columns}
          data={batidos}
          loading={loadingBatidos}
          getRowKey={(r) => r.id}
          emptyTitle="Sin batidos"
          emptyDescription={`No hay batidos registrados para el ${formatDate(fecha)}.`}
        />
      </div>
    </div>
  );
}
