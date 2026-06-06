import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import useInactivityLogout from '../../hooks/useInactivityLogout';
import useAlertasStore from '../../store/alertasStore';
import useAuthStore from '../../store/authStore';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const connect    = useAlertasStore((s) => s.connect);
  const disconnect = useAlertasStore((s) => s.disconnect);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useInactivityLogout(30);

  useEffect(() => {
    if (!accessToken) return undefined;
    connect();
    return () => disconnect();
  }, [accessToken, connect, disconnect]);

  return (
    <div className="flex h-screen flex-col bg-cream-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-xl focus:bg-rose-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow"
      >
        Saltar al contenido principal
      </a>
      <TopBar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
