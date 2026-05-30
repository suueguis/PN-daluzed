import { useEffect } from 'react';

import useAlertasStore from '../../store/alertasStore';
import { useAlertasActivas } from '../../hooks/alertas/useAlertas';
import AlertasTable from './AlertasTable';

export default function AlertasActivasPage() {
  const { isLoading, data, refetch } = useAlertasActivas();
  const alertas = useAlertasStore((s) => s.alertas);

  // Hidratar el store cuando llega data del servidor.
  useEffect(() => {
    if (Array.isArray(data)) {
      useAlertasStore.getState().setAlertas(data);
    }
  }, [data]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-wine-700">
          Total activas: {alertas.length}
        </h2>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs font-semibold text-rose-500 hover:text-wine-900"
        >
          Recargar
        </button>
      </div>
      <AlertasTable data={alertas} loading={isLoading} />
    </div>
  );
}
