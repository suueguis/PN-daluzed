import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../utils/cn';

const TABS = [
  { to: 'unidades',           label: 'Unidades' },
  { to: 'proveedores',        label: 'Proveedores' },
  { to: 'materias-primas',    label: 'Materias primas' },
  { to: 'productos-terminados', label: 'Productos terminados' },
  { to: 'presentaciones',     label: 'Presentaciones' },
];

export default function CatalogoLayout() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="font-crushed text-2xl sm:text-3xl text-wine-900">Catálogo maestro</h1>
        <p className="text-sm text-wine-700">
          Gestiona unidades, proveedores, materias primas, productos y presentaciones.
        </p>
      </header>

      <nav
        aria-label="Pestañas de catálogo"
        className="flex flex-wrap gap-1 border-b border-peach-200"
      >
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) =>
              cn(
                '-mb-px rounded-t-xl px-4 py-2 text-sm font-semibold transition-colors',
                isActive
                  ? 'border border-peach-200 border-b-white bg-white text-wine-900'
                  : 'text-wine-700 hover:bg-cream-100',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <section>
        <Outlet />
      </section>
    </div>
  );
}
