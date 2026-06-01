import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ordenesAPI } from '../../api/recepcionAPI';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';

const ESTADO_OPTIONS = [
  { value: '',          label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'RECIBIDA',  label: 'Recibida' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const ESTADO_TONE = { PENDIENTE: 'warning', RECIBIDA: 'success', CANCELADA: 'danger' };

export default function OrdenesPage() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['recepcion', 'ordenes', estado],
    queryFn: () => ordenesAPI.list(estado ? { estado } : {}).then((r) => r.data),
  });

  const ordenes = data?.results ?? data ?? [];

  const columns = [
    { key: 'id',             header: '# OC',     render: (r) => `OC-${r.id}` },
    { key: 'proveedor',      header: 'Proveedor', render: (r) => r.proveedor },
    { key: 'fecha_creacion', header: 'Fecha',     render: (r) => r.fecha_creacion },
    {
      key: 'estado',
      header: 'Estado',
      render: (r) => (
        <Badge tone={ESTADO_TONE[r.estado] ?? 'neutral'}>{r.estado}</Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      cellClassName: 'text-right',
      render: (r) => (
        <Button
          size="sm"
          variant="ghost"
          disabled={r.estado !== 'PENDIENTE'}
          onClick={() => navigate(`/recepcion/recepciones/nueva?oc=${r.id}`)}
        >
          Registrar recepción
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select
          options={ESTADO_OPTIONS}
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          placeholder=""
          className="w-52"
          aria-label="Filtrar por estado"
        />
        <Button onClick={() => navigate('/recepcion/ordenes/nueva')}>+ Nueva OC</Button>
      </div>

      <Table
        columns={columns}
        data={ordenes}
        loading={isLoading}
        emptyTitle="No hay órdenes de compra"
        emptyDescription="Crea una orden de compra para comenzar."
      />
    </div>
  );
}
