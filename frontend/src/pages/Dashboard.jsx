import useAuthStore from '../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();
  return (
    <div className="space-y-4">
      <h1 className="font-crushed text-4xl text-wine-900">¡Panel de Control de Daluzed!</h1>
      <p className="text-wine-700">
        Bienvenido{user?.username ? `, ${user.username}` : ''}. Selecciona un módulo en la barra lateral.
      </p>
    </div>
  );
}
