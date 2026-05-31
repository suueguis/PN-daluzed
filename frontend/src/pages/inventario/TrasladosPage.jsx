import { useSearchParams } from 'react-router-dom';
import { useTraslados } from '../../hooks/inventario/useInventario';
import Table from '../../components/ui/Table';
import TrasladoForm from './TrasladoForm';
import { formatDecimal, formatDateTime } from '../../utils/formatters';

const columns = [
  { key: 'id', header: '# Mov.', render: (m) => `#${m.id}` },
  { key: 'lote', header: 'Lote', render: (m) => `#${m.lote}` },
  { key: 'bodega_origen', header: 'Origen', render: (m) => m.bodega_origen_nombre ?? '—' },
  { key: 'bodega_destino', header: 'Destino', render: (m) => m.bodega_destino_nombre ?? '—' },
  { key: 'cantidad', header: 'Cantidad', render: (m) => formatDecimal(m.cantidad), cellClassName: 'tabular-nums text-right' },
  { key: 'fecha', header: 'Fecha', render: (m) => formatDateTime(m.fecha) },
  { key: 'notas', header: 'Notas', render: (m) => m.notas || '—' },
];

export default function TrasladosPage() {
  const [params] = useSearchParams();
  const defaultMpId = params.get('mp') ?? '';

  const { data: traslados = [], isLoading } = useTraslados();

  return (
    <div className="space-y-6">
      {/* Formulario de traslado */}
      <div className="rounded-2xl border border-peach-200 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-wine-900">Nuevo Traslado BP → PDP</h2>
        <TrasladoForm defaultMpId={defaultMpId} />
      </div>

      {/* Histórico */}
      <div>
        <h2 className="mb-3 text-base font-bold text-wine-900">Histórico de Traslados</h2>
        <Table
          columns={columns}
          data={traslados}
          loading={isLoading}
          emptyTitle="Sin traslados"
          emptyDescription="Aún no se han registrado traslados."
          getRowKey={(m) => m.id}
        />
      </div>
    </div>
  );
}
