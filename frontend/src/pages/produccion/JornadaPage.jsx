import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, LayoutList, AlignLeft } from 'lucide-react';
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

function TimelineItem({ batido, isLast }) {
  const isEnProceso = batido.estado === 'EN_PROCESO';
  return (
    <div className="relative flex gap-4">
      {/* vertical line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 h-full w-0.5 bg-peach-200" />
      )}
      {/* dot */}
      <div
        className={`relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
          isEnProceso
            ? 'border-rose-400 bg-rose-100'
            : 'border-mint-400 bg-mint-100'
        }`}
      >
        <div
          className={`h-2 w-2 rounded-full ${
            isEnProceso ? 'animate-pulse bg-rose-500' : 'bg-mint-500'
          }`}
        />
      </div>
      {/* content */}
      <div className="mb-4 flex-1 rounded-xl border border-peach-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-wine-900">
              {batido.producto_terminado_nombre ?? `Prod. #${batido.producto_terminado}`}
            </p>
            <p className="text-xs text-wine-700">
              Batido #{batido.id} · inicio {batido.hora_inicio}
            </p>
          </div>
          <Badge state={batido.estado} />
        </div>
      </div>
    </div>
  );
}

function TimelineView({ batidos, loading }) {
  if (loading) {
    return <div className="flex justify-center py-8"><Spinner size="lg" /></div>;
  }
  if (batidos.length === 0) {
    return (
      <p className="rounded-2xl border border-peach-200 bg-cream-50 px-5 py-4 text-sm text-wine-700">
        Sin batidos para esta fecha.
      </p>
    );
  }
  const enProceso = batidos.filter((b) => b.estado === 'EN_PROCESO').length;
  return (
    <div className="space-y-3">
      {enProceso > 0 && (
        <p className="text-sm font-semibold text-rose-600">
          {enProceso} máquina{enProceso > 1 ? 's' : ''} en proceso ahora
        </p>
      )}
      <div>
        {batidos.map((b, i) => (
          <TimelineItem key={b.id} batido={b} isLast={i === batidos.length - 1} />
        ))}
      </div>
    </div>
  );
}

export default function JornadaPage() {
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [vista, setVista] = useState('tabla');

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
      key: 'producto_terminado_nombre',
      header: 'Producto',
      render: (row) => row.producto_terminado_nombre ?? `Prod. #${row.producto_terminado}`,
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
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays size={20} className="text-wine-700" />
          <Input
            label="Fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>

        {/* Toggle vista */}
        <div
          role="group"
          aria-label="Cambiar vista"
          className="ml-auto flex overflow-hidden rounded-xl border border-peach-300 bg-cream-50"
        >
          <button
            type="button"
            aria-pressed={vista === 'tabla'}
            onClick={() => setVista('tabla')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
              vista === 'tabla'
                ? 'bg-wine-700 text-white'
                : 'text-wine-700 hover:bg-peach-100'
            }`}
          >
            <LayoutList size={14} />
            Tabla
          </button>
          <button
            type="button"
            aria-pressed={vista === 'timeline'}
            onClick={() => setVista('timeline')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
              vista === 'timeline'
                ? 'bg-wine-700 text-white'
                : 'text-wine-700 hover:bg-peach-100'
            }`}
          >
            <AlignLeft size={14} />
            Timeline
          </button>
        </div>
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
        {vista === 'tabla' ? (
          <Table
            columns={columns}
            data={batidos}
            loading={loadingBatidos}
            getRowKey={(r) => r.id}
            emptyTitle="Sin batidos"
            emptyDescription={`No hay batidos registrados para el ${formatDate(fecha)}.`}
          />
        ) : (
          <TimelineView batidos={batidos} loading={loadingBatidos} />
        )}
      </div>
    </div>
  );
}
