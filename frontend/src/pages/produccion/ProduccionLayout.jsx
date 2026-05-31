import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import BatidosPage from './BatidosPage';
import NuevoBatidoPage from './NuevoBatidoPage';
import DespachosPage from './DespachosPage';
import JornadaPage from './JornadaPage';
import CompensatoriosPage from './CompensatoriosPage';

const tabs = [
  { to: '/produccion/batidos', label: 'Batidos', end: true },
  { to: '/produccion/batidos/nuevo', label: 'Nuevo batido', end: false },
  { to: '/produccion/despachos', label: 'Despachos', end: false },
  { to: '/produccion/jornada', label: 'Jornada', end: false },
  { to: '/produccion/compensatorios', label: 'Compensatorios', end: false },
];

export default function ProduccionLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-crushed text-3xl text-wine-900">Producción</h1>
        <nav className="mt-4 flex gap-1 border-b border-peach-200">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors',
                  isActive
                    ? 'border-b-2 border-rose-500 text-rose-500'
                    : 'text-wine-700 hover:text-wine-900 hover:bg-cream-100',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Routes>
        <Route index element={<Navigate to="batidos" replace />} />
        <Route path="batidos" element={<BatidosPage />} />
        <Route path="batidos/nuevo" element={<NuevoBatidoPage />} />
        <Route path="despachos" element={<DespachosPage />} />
        <Route path="jornada" element={<JornadaPage />} />
        <Route path="compensatorios" element={<CompensatoriosPage />} />
      </Routes>
    </div>
  );
}
