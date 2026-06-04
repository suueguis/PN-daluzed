import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { logoutAPI, cambiarContrasenaAPI } from '../api/authAPI';
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

const emptyPasswordForm = {
  contrasena_actual: '',
  nueva_contrasena: '',
  confirmar_contrasena: '',
};

function extractError(error) {
  const data = error?.response?.data;
  if (!data) return 'No se pudo cambiar la contraseña. Intenta nuevamente.';

  const firstKey = Object.keys(data)[0];
  const value = data[firstKey];
  if (Array.isArray(value)) return value[0];
  if (typeof value === 'string') return value;
  return 'No se pudo cambiar la contraseña.';
}

export default function Perfil() {
  const navigate = useNavigate();
  const { user, loginAt, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [pwdForm, setPwdForm] = useState(emptyPasswordForm);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

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

  const handlePwdChange = (field) => (event) => {
    setPwdForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handlePwdSubmit = async (event) => {
    event.preventDefault();

    if (!pwdForm.contrasena_actual || !pwdForm.nueva_contrasena || !pwdForm.confirmar_contrasena) {
      toast.error('Todos los campos son obligatorios.');
      return;
    }

    if (pwdForm.nueva_contrasena !== pwdForm.confirmar_contrasena) {
      toast.error('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setPwdSubmitting(true);
    try {
      await cambiarContrasenaAPI(
        pwdForm.contrasena_actual,
        pwdForm.nueva_contrasena,
        pwdForm.confirmar_contrasena,
      );
      toast.success('Contraseña actualizada correctamente.');
      setPwdForm(emptyPasswordForm);
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setPwdSubmitting(false);
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

      <section
        className="rounded-2xl border border-peach-200 bg-white p-6 shadow-sm"
        data-testid="cambio-contrasena-section"
      >
        <h2 className="font-crushed text-xl text-wine-900">Cambiar contraseña</h2>
        <p className="mt-1 text-sm text-wine-700">
          Usa una contraseña fuerte que no hayas reutilizado en otros sitios.
        </p>

        <form className="mt-4 space-y-4" onSubmit={handlePwdSubmit}>
          <div>
            <label
              htmlFor="contrasena_actual"
              className="block text-xs font-semibold uppercase tracking-wide text-wine-700/70"
            >
              Contraseña actual
            </label>
            <input
              id="contrasena_actual"
              type="password"
              autoComplete="current-password"
              value={pwdForm.contrasena_actual}
              onChange={handlePwdChange('contrasena_actual')}
              className="mt-1 w-full rounded-xl border border-peach-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>

          <div>
            <label
              htmlFor="nueva_contrasena"
              className="block text-xs font-semibold uppercase tracking-wide text-wine-700/70"
            >
              Nueva contraseña
            </label>
            <input
              id="nueva_contrasena"
              type="password"
              autoComplete="new-password"
              value={pwdForm.nueva_contrasena}
              onChange={handlePwdChange('nueva_contrasena')}
              className="mt-1 w-full rounded-xl border border-peach-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>

          <div>
            <label
              htmlFor="confirmar_contrasena"
              className="block text-xs font-semibold uppercase tracking-wide text-wine-700/70"
            >
              Confirmar nueva contraseña
            </label>
            <input
              id="confirmar_contrasena"
              type="password"
              autoComplete="new-password"
              value={pwdForm.confirmar_contrasena}
              onChange={handlePwdChange('confirmar_contrasena')}
              className="mt-1 w-full rounded-xl border border-peach-300 bg-cream-50 px-3 py-2 text-sm text-wine-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pwdSubmitting}>
              {pwdSubmitting ? 'Actualizando…' : 'Actualizar contraseña'}
            </Button>
          </div>
        </form>
      </section>

      <div className="flex justify-end">
        <Button variant="danger" onClick={handleLogout} disabled={loading}>
          {loading ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </Button>
      </div>
    </div>
  );
}
