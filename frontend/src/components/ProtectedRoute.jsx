import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function ProtectedRoute({ children, roles }) {
  const { accessToken, user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return null;

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
