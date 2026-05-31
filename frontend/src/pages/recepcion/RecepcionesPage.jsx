import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { recepcionesAPI } from '../../api/recepcionAPI';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export default function RecepcionesPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['recepcion', 'recepciones'],
    queryFn: () => recepcionesAPI.list().then((r) => r.data),
  });

  const recepciones = data?.results ?? data ?? [];

  const columns = [
    { key: 'id',          header: '# Recepción', render: (r) => `REC-${r.id}` },
    { key: 'orden_compra', header: 'OC',          render: (r) => `OC-${r.orden_compra}` },
    { key: 'fecha',        header: 'Fecha',        render: (r) => r.fecha },
    { key: 'usuario',      header: 'Usuario',      render: (r) => r.usuario ?? '—' },
    {
      key: 'confirmada',
      header: 'Estado',
      render: (r) => (
        <Badge tone={r.confirmada ? 'success' : 'warning'}>
          {r.confirmada ? 'Confirmada' : 'Pendiente'}
        </Badge>
      ),
    },
    {
      key: 'detalle',
      header: '',
      cellClassName: 'text-right',
      render: (r) => (
        <Button size="sm" variant="ghost" onClick={() => navigate(`/recepcion/recepciones/${r.id}`)}>
          Ver detalle
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => navigate('/recepcion/recepciones/nueva')}>+ Nueva recepción</Button>
      </div>

      <Table
        columns={columns}
        data={recepciones}
        loading={isLoading}
        emptyTitle="No hay recepciones registradas"
        emptyDescription="Registra la primera recepción contra una orden de compra."
      />
    </div>
  );
}
