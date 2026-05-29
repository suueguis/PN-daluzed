import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import Button from '../ui/Button';

export default function TopBar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post('/api/v1/auth/logout/', {}, { withCredentials: true });
    } catch {
      /* ignore */
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
          <div className="text-right leading-tight">
            <div className="text-sm font-semibold text-wine-900">{user.username}</div>
            <div className="text-xs text-wine-700">{user.role}</div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Salir
        </Button>
      </div>
    </header>
  );
}
