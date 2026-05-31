import useAuthStore from '../store/authStore';

export default function RoleGate({ roles = [], fallback = null, children }) {
  const { user } = useAuthStore();
  if (!user) return fallback;
  if (roles.includes('*')) return children;
  return roles.includes(user.role) ? children : fallback;
}
