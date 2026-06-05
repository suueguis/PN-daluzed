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
  { value: 'PARCIAL',   label: 'Parcial' },
  { value: 'RECIBIDA',  label: 'Recibida' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const ESTADO_TONE = { PENDIENTE: 'warning', PARCIAL: 'info', RECIBIDA: 'success', CANCELADA: 'danger' };
const ESTADO_LABEL = { PENDIENTE: 'Pendiente', PARCIAL: 'Parcial', RECIBIDA: 'Recibida', CANCELADA: 'Cancelada' };

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
    { key: 'proveedor',      header: 'Proveedor', render: (r) => r.proveedor_nombre ?? r.proveedor },
    { key: 'fecha_creacion', header: 'Fecha',     render: (r) => r.fecha_creacion },
    {
      key: 'estado',
      header: 'Estado',
      render: (r) => {
        const saldoPendiente = r.detalles?.reduce((s, d) => s + parseFloat(d.saldo_pendiente ?? 0), 0);
        return (
          <div className="flex items-center gap-2">
            <Badge tone={ESTADO_TONE[r.estado] ?? 'neutral'}>
              {ESTADO_LABEL[r.estado] ?? r.estado}
            </Badge>
            {r.estado === 'PARCIAL' && saldoPendiente > 0 && (
              <span className="text-xs text-wine-700/70">({saldoPendiente.toFixed(0)} pendiente)</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'acciones',
      header: '',
      cellClassName: 'text-right',
      render: (r) => (
        <Button
          size="sm"
          variant="ghost"
          disabled={r.estado !== 'PENDIENTE' && r.estado !== 'PARCIAL'}
          onClick={() => navigate(`/recepcion/recepciones/nueva?oc=${r.id}`)}
        >
          {r.estado === 'PARCIAL' ? 'Completar recepción' : 'Registrar recepción'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          options={ESTADO_OPTIONS}
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          placeholder=""
          className="w-full sm:w-52"
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
