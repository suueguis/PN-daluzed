import useAuthStore from '../store/authStore';

export default function RoleGate({ allowed, roles, fallback = null, children }) {
  const allowedRoles = allowed ?? roles ?? [];
  const { user } = useAuthStore();
  if (!user) return fallback;
  if (allowedRoles.includes('*')) return children;
  return allowedRoles.includes(user.role) ? children : fallback;
}
