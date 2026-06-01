import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Menu } from 'lucide-react';
import { logoutAPI } from '../../api/authAPI';
import useAlertasStore from '../../store/alertasStore';
import useAuthStore from '../../store/authStore';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function TopBar({ onMenuClick }) {
  const { user, clearAuth } = useAuthStore();
  const alertasCount = useAlertasStore((s) => s.alertas.length);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutAPI();
      toast.success('Sesión cerrada correctamente');
    } catch {
      /* ignore — sesión local se limpia igualmente */
    } finally {
      useAlertasStore.getState().disconnect();
      useAlertasStore.getState().reset();
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className="flex h-[60px] items-center justify-between border-b border-peach-200 bg-white px-3 sm:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-wine-900 hover:bg-peach-100 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <img src="/logo.png" alt="Daluzed" className="h-10 w-auto" />
        <span className="font-crushed text-xl text-wine-900">Daluzed</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          aria-label="Alertas activas"
          onClick={() => navigate('/alertas')}
          className="relative rounded-full p-2 text-wine-900 transition-colors hover:bg-peach-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
        >
          <span aria-hidden className="text-xl">🔔</span>
          {alertasCount > 0 && (
            <Badge
              tone="danger"
              className="absolute -top-1 -right-1 min-w-[1.25rem] justify-center rounded-full px-1.5 py-0 text-[10px]"
            >
              {alertasCount > 99 ? '99+' : alertasCount}
            </Badge>
          )}
        </button>
        {user && (
          <Link
            to="/perfil"
            aria-label="Ir a mi perfil"
            className="rounded-lg px-2 py-1 text-right leading-tight transition-colors hover:bg-cream-100"
          >
            <div className="max-w-[8rem] truncate text-sm font-semibold text-wine-900">{user.username}</div>
            <div className="hidden text-xs text-wine-700 sm:block">{user.role}</div>
          </Link>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Salir
        </Button>
      </div>
    </header>
  );
}
