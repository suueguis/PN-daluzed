import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../utils/cn';

const tabs = [
  { to: '/inventario/stock',      label: 'Stock' },
  { to: '/inventario/lotes',      label: 'Lotes' },
  { to: '/inventario/bodegas',    label: 'Bodegas' },
  { to: '/inventario/traslados',  label: 'Traslados' },
  { to: '/inventario/devoluciones', label: 'Devoluciones' },
  { to: '/inventario/descartes',  label: 'Descartes' },
];

export default function InventarioLayout() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-crushed text-2xl sm:text-3xl text-wine-900">Inventario</h1>
        <p className="text-sm text-wine-700">Gestión de stock, lotes y movimientos</p>
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
                    'px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors',
                    isActive
                      ? 'border-rose-500 text-rose-500 bg-white'
                      : 'border-transparent text-wine-700 hover:text-wine-900 hover:bg-cream-100',
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
