import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logoutAPI } from '../../api/authAPI';
import useAuthStore from '../../store/authStore';
import Button from '../ui/Button';

export default function TopBar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutAPI();
      toast.success('Sesión cerrada correctamente');
    } catch {
      /* ignore — sesión local se limpia igualmente */
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className="flex h-[60px] items-center justify-between border-b border-peach-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Daluzed" className="h-10 w-auto" />
        <span className="font-crushed text-xl text-wine-900">Daluzed</span>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <Link
            to="/perfil"
            aria-label="Ir a mi perfil"
            className="rounded-lg px-2 py-1 text-right leading-tight transition-colors hover:bg-cream-100"
          >
            <div className="text-sm font-semibold text-wine-900">{user.username}</div>
            <div className="text-xs text-wine-700">{user.role}</div>
          </Link>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Salir
        </Button>
      </div>
    </header>
  );
}
