import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { materiasPrimasAPI } from '../api/catalogoAPI';
import { alertasAPI } from '../api/alertasAPI';
import { produccionAPI } from '../api/produccionAPI';
import useAuthStore from '../store/authStore';

const ROLE_LABEL = {
  ADMIN:      'Admin',
  GERENTE:    'Gerente',
  PRODUCCION: 'Producción',
  INVENTARIO: 'Inventario',
};

// Handles both paginated { count, results:[] } and plain array responses
function countOf(data) {
  if (data == null) return null;
  if (typeof data.count === 'number') return data.count;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.results)) return data.results.length;
  return null;
}

const today = new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const { user } = useAuthStore();
  const displayName = ROLE_LABEL[user?.role] ?? 'invitado';

  const { data: mpsData, isLoading: mpsLoading } = useQuery({
    queryKey: ['dashboard', 'mps'],
    queryFn: () => materiasPrimasAPI.list(),
    staleTime: 60_000,
  });

  const { data: alertasData, isLoading: alertasLoading } = useQuery({
    queryKey: ['dashboard', 'alertas'],
    queryFn: alertasAPI.activas,
    staleTime: 30_000,
  });

  const { data: batidosData, isLoading: batidosLoading } = useQuery({
    queryKey: ['dashboard', 'batidos', today],
    queryFn: () => produccionAPI.listBatidos({ fecha: today }).then((r) => r.data),
    staleTime: 30_000,
  });

  const cards = [
    {
      key:   'mp',
      label: 'Materias primas',
      value: mpsLoading     ? '…' : (countOf(mpsData)     ?? '—'),
      hint:  'registradas en catálogo',
      link:  '/catalogo/materias-primas',
      tone:  'bg-cream-100 border-peach-200',
    },
    {
      key:   'alertas',
      label: 'Alertas activas',
      value: alertasLoading ? '…' : (countOf(alertasData) ?? '—'),
      hint:  'requieren atención',
      link:  '/alertas',
      tone:  'bg-butter-200/60 border-butter-200',
    },
    {
      key:   'batidos',
      label: 'Batidos del día',
      value: batidosLoading ? '…' : (countOf(batidosData) ?? '—'),
      hint:  today,
      link:  '/produccion',
      tone:  'bg-mint-200/50 border-mint-200',
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-crushed text-4xl text-wine-900">
          Hola, {displayName}
        </h1>
        <p className="mt-1 text-wine-700">
          Bienvenido al panel de Daluzed. Aquí verás un resumen rápido del estado de la operación.
        </p>
      </header>

      <section
        aria-label="Resumen rápido"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map((card) => (
          <Link
            key={card.key}
            to={card.link}
            data-testid={`stub-card-${card.key}`}
            className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${card.tone}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-wine-700/80">
              {card.label}
            </p>
            <p className="mt-2 font-crushed text-3xl text-wine-900">{card.value}</p>
            <p className="mt-2 text-xs text-wine-700/80">{card.hint}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
