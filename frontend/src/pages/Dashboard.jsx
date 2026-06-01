import useAuthStore from '../store/authStore';

const ROLE_LABEL = {
  ADMIN:      'Admin',
  GERENTE:    'Gerente',
  PRODUCCION: 'Producción',
  INVENTARIO: 'Inventario',
};

const stubCards = [
  {
    key: 'mp',
    label: 'Materias primas',
    value: '—',
    hint: 'Se llenará con el módulo Catálogo',
    tone: 'bg-cream-100 border-peach-200',
  },
  {
    key: 'alertas',
    label: 'Alertas activas',
    value: '—',
    hint: 'Se llenará con el módulo Alertas',
    tone: 'bg-butter-200/60 border-butter-200',
  },
  {
    key: 'batidos',
    label: 'Batidos del día',
    value: '—',
    hint: 'Se llenará con el módulo Producción',
    tone: 'bg-mint-200/50 border-mint-200',
  },
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const displayName = ROLE_LABEL[user?.role] ?? 'invitado';

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
        {stubCards.map((card) => (
          <article
            key={card.key}
            data-testid={`stub-card-${card.key}`}
            className={`rounded-2xl border p-5 shadow-sm ${card.tone}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-wine-700/80">
              {card.label}
            </p>
            <p className="mt-2 font-crushed text-3xl text-wine-900">{card.value}</p>
            <p className="mt-2 text-xs text-wine-700/80">{card.hint}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
