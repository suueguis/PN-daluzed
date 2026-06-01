import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../utils/cn';

const tabs = [
  { label: 'Órdenes de Compra', to: '/recepcion/ordenes' },
  { label: 'Recepciones',       to: '/recepcion/recepciones' },
];

export default function RecepcionLayout() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-crushed text-2xl sm:text-3xl text-wine-900">Recepción de Mercancía</h1>
        <p className="mt-1 text-sm text-wine-700">
          Gestiona órdenes de compra y registra ingresos de materias primas.
        </p>
      </div>

      <div className="border-b border-peach-200">
        <nav className="overflow-x-auto">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    'px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px',
                    isActive
                      ? 'border-rose-500 text-rose-500'
                      : 'border-transparent text-wine-700 hover:text-wine-900 hover:border-peach-300',
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
