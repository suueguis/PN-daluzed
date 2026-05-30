import { useAlertasProduccion } from '../../hooks/alertas/useAlertas';
import Table from '../../components/ui/Table';
import { formatDate } from '../../utils/formatters';
import { formatDecimal } from '../../utils/formatters';

export default function AlertasProduccionPage() {
  const { isLoading, data = [] } = useAlertasProduccion();

  const columns = [
    { key: 'lote_pt_id',        header: 'Lote PT' },
    { key: 'producto',          header: 'Producto' },
    {
      key: 'cantidad',
      header: 'Cantidad',
      render: (row) => formatDecimal(row.cantidad, 0),
      cellClassName: 'text-right',
    },
    {
      key: 'fecha_vencimiento',
      header: 'Vencimiento',
      render: (row) => formatDate(row.fecha_vencimiento),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-wine-700">
        Lotes PT en EN_ESPERA con vencimiento pasado
      </h2>
      <Table
        columns={columns}
        data={data}
        loading={isLoading}
        emptyTitle="Sin lotes vencidos"
        getRowKey={(row) => row.lote_pt_id}
      />
    </div>
  );
}
