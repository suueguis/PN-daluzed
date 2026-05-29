import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { logoutAPI } from '../api/authAPI';
import useAuthStore from '../store/authStore';
import Button from '../components/ui/Button';

const roleLabels = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  PRODUCCION: 'Producción',
  INVENTARIO: 'Inventario',
};

function formatLoginAt(iso) {
  if (!iso) return '—';
  try {
    return format(new Date(iso), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  } catch {
    return '—';
  }
}

export default function Perfil() {
  const navigate = useNavigate();
  const { user, loginAt, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutAPI();
      toast.success('Sesión cerrada correctamente');
    } catch {
      toast.error('No se pudo cerrar sesión en el servidor, pero la sesión local fue limpiada.');
    } finally {
      clearAuth();
      setLoading(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-crushed text-3xl text-wine-900">Mi perfil</h1>
        <p className="text-sm text-wine-700">Datos de la cuenta y sesión actual.</p>
      </header>

      <section className="rounded-2xl border border-peach-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-wine-700/70">
              Correo electrónico
            </dt>
            <dd className="mt-1 text-sm text-wine-900" data-testid="perfil-email">
              {user?.username ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-wine-700/70">
              Rol
            </dt>
            <dd className="mt-1 text-sm text-wine-900" data-testid="perfil-role">
              {roleLabels[user?.role] ?? user?.role ?? '—'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-wine-700/70">
              Último inicio de sesión
            </dt>
            <dd className="mt-1 text-sm text-wine-900" data-testid="perfil-login-at">
              {formatLoginAt(loginAt)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex justify-end">
        <Button variant="danger" onClick={handleLogout} disabled={loading}>
          {loading ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </Button>
      </div>
    </div>
  );
}
