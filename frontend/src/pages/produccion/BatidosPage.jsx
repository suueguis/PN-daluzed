import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { useApiQuery } from '../../hooks/useApi';
import { formatDate } from '../../utils/formatters';

export default function BatidosPage() {
  const { data, isLoading } = useApiQuery(['batidos'], '/produccion/batidos/');

  const rows = Array.isArray(data) ? data : (data?.results ?? []);

  const columns = [
    { key: 'id', header: '#', cellClassName: 'w-12 font-mono text-xs text-wine-700' },
    {
      key: 'producto_terminado',
      header: 'Producto',
      render: (row) => `Prod. #${row.producto_terminado}`,
    },
    {
      key: 'fecha_produccion',
      header: 'Fecha',
      render: (row) => formatDate(row.fecha_produccion),
    },
    { key: 'hora_inicio', header: 'Hora inicio' },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => <Badge state={row.estado} />,
    },
    {
      key: 'fecha_registro',
      header: 'Registrado',
      render: (row) => formatDate(row.fecha_registro),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-wine-900">Batidos</h2>
        <Button as={Link} to="/produccion/batidos/nuevo" size="sm">
          <Plus size={14} /> Nuevo batido
        </Button>
      </div>
      <Table
        columns={columns}
        data={rows}
        loading={isLoading}
        getRowKey={(r) => r.id}
        emptyTitle="Sin batidos"
        emptyDescription="Registra el primer batido del día."
      />
    </div>
  );
}
