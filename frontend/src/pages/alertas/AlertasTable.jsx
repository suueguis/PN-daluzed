import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { formatDateTime } from '../../utils/formatters';
import { useResolverAlerta } from '../../hooks/alertas/useAlertas';

const tipoTone = {
  STOCK_BAJO:          'danger',
  VENCIMIENTO_PROXIMO: 'warning',
  EN_ESPERA_PENDIENTE: 'info',
};

const tipoLabel = {
  STOCK_BAJO:          'Stock bajo',
  VENCIMIENTO_PROXIMO: 'Vencimiento próximo',
  EN_ESPERA_PENDIENTE: 'Lote PT pendiente',
};

export default function AlertasTable({ data = [], loading = false, allowResolver = true }) {
  const resolver = useResolverAlerta();

  const columns = [
    {
      key: 'tipo',
      header: 'Tipo',
      render: (row) => (
        <Badge tone={tipoTone[row.tipo] ?? 'neutral'}>
          {tipoLabel[row.tipo] ?? row.tipo}
        </Badge>
      ),
    },
    { key: 'materia_prima', header: 'MP',     render: (row) => row.materia_prima ?? '—' },
    { key: 'bodega',        header: 'Bodega', render: (row) => row.bodega ?? '—' },
    {
      key: 'mensaje',
      header: 'Mensaje',
      render: (row) => (
        <span className="text-wine-900">{row.mensaje}</span>
      ),
      cellClassName: 'max-w-md whitespace-pre-line',
    },
    {
      key: 'fecha_creacion',
      header: 'Fecha',
      render: (row) => formatDateTime(row.fecha_creacion),
    },
  ];

  if (allowResolver) {
    columns.push({
      key: 'acciones',
      header: 'Acción',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          disabled={resolver.isPending}
          onClick={() => resolver.mutate({ id: row.id })}
        >
          Resolver
        </Button>
      ),
    });
  }

  return (
    <Table
      columns={columns}
      data={data}
      loading={loading}
      emptyTitle="Sin alertas"
      emptyDescription="No hay alertas activas en este momento."
      getRowKey={(row) => row.id ?? row.alerta_id}
    />
  );
}
