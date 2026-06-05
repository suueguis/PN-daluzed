import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../utils/cn';

const tabs = [
  { to: 'reportes', label: 'Reportes' },
];

export default function IndicadoresLayout() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-crushed text-2xl text-wine-900">Indicadores</h1>
        <p className="text-sm text-wine-700">Reportes históricos y análisis de operaciones.</p>
      </div>

      <nav
        aria-label="Pestañas de indicadores"
        className="flex flex-wrap gap-2 rounded-2xl border border-peach-200 bg-white p-1"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-wine-900 hover:bg-peach-100',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
