import { useAlertasReorden } from '../../hooks/alertas/useAlertas';
import AlertasTable from './AlertasTable';

export default function AlertasReordenPage() {
  const { isLoading, data = [] } = useAlertasReorden();

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-wine-700">
        Materias primas bajo el punto de reorden
      </h2>
      <AlertasTable data={data} loading={isLoading} />
    </div>
  );
}
