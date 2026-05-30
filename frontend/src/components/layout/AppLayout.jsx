import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import useAlertasStore from '../../store/alertasStore';
import useAuthStore from '../../store/authStore';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const connect    = useAlertasStore((s) => s.connect);
  const disconnect = useAlertasStore((s) => s.disconnect);

  useEffect(() => {
    if (!accessToken) return undefined;
    connect();
    return () => disconnect();
  }, [accessToken, connect, disconnect]);

  return (
    <div className="flex h-screen flex-col bg-cream-50">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
