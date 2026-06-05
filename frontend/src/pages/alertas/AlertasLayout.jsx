import { NavLink, Outlet } from 'react-router-dom';

import Badge from '../../components/ui/Badge';
import useAlertasStore from '../../store/alertasStore';
import useAuthStore from '../../store/authStore';
import { cn } from '../../utils/cn';

const getTabs = (role) => {
  const baseTabs = [
    { to: '',                    label: 'Activas',            end: true },
    { to: 'reorden',             label: 'Reorden' },
    { to: 'vencimiento',         label: 'Vencimiento' },
    { to: 'produccion-vencida',  label: 'Producción vencida' },
  ];
  if (role === 'ADMIN') {
    baseTabs.push({ to: 'configuracion', label: 'Configuración' });
  }
  return baseTabs;
};

export default function AlertasLayout() {
  const activasCount = useAlertasStore((s) => s.alertas.length);
  const isConnected = useAlertasStore((s) => s.isConnected);
  const role = useAuthStore((s) => s.user?.role);
  const tabs = getTabs(role);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-crushed text-2xl text-wine-900">Alertas</h1>
          <p className="text-sm text-wine-700">
            Notificaciones en tiempo real del sistema.
          </p>
        </div>
        <Badge tone={isConnected ? 'success' : 'neutral'}>
          {isConnected ? 'En vivo' : 'Sin conexión WS'}
        </Badge>
      </div>

      <nav
        aria-label="Pestañas de alertas"
        className="flex flex-wrap gap-2 rounded-2xl border border-peach-200 bg-white p-1"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to || 'activas'}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-wine-900 hover:bg-peach-100',
              )
            }
          >
            <span>{tab.label}</span>
            {tab.end && activasCount > 0 && (
              <Badge tone="danger" className="ml-1">
                {activasCount}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
