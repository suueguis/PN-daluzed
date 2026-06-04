import { useTrazabilidad } from '../../hooks/inventario/useInventario';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { formatDateTime, formatDecimal } from '../../utils/formatters';

const TIPO_LABEL = {
  RECEPCION:  { label: 'Recepción',  tone: 'success' },
  TRASLADO:   { label: 'Traslado',   tone: 'info'    },
  CONSUMO:    { label: 'Consumo',    tone: 'warning'  },
  DEVOLUCION: { label: 'Devolución', tone: 'neutral'  },
  DESCARTE:   { label: 'Descarte',   tone: 'danger'   },
  AJUSTE:     { label: 'Ajuste',     tone: 'neutral'  },
};

function tipoLabel(tipo) {
  return TIPO_LABEL[tipo] ?? { label: tipo, tone: 'neutral' };
}

function flujoBodega(mov) {
  if (mov.bodega_origen_nombre && mov.bodega_destino_nombre) {
    return `${mov.bodega_origen_nombre} → ${mov.bodega_destino_nombre}`;
  }
  return mov.bodega_destino_nombre ?? mov.bodega_origen_nombre ?? '—';
}

export default function TrazabilidadModal({ lote, onClose }) {
  const { data, isLoading } = useTrazabilidad(lote?.id);
  const movimientos = data?.movimientos ?? [];

  return (
    <Modal
      open={!!lote}
      onClose={onClose}
      title={`Historial de lote ${lote?.numero_lote || `#${lote?.id}`}`}
      size="xl"
      footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
    >
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : movimientos.length === 0 ? (
        <EmptyState title="Sin movimientos" description="Este lote no tiene movimientos registrados." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100">
              <tr>
                {['Tipo', 'Fecha', 'Bodega', 'Cantidad', 'Notas'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-wine-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movimientos.map((mov) => {
                const { label, tone } = tipoLabel(mov.tipo);
                return (
                  <tr key={mov.id} className="border-t border-peach-200/60 hover:bg-cream-50">
                    <td className="px-4 py-2">
                      <Badge tone={tone}>{label}</Badge>
                    </td>
                    <td className="px-4 py-2 tabular-nums text-wine-900 whitespace-nowrap">
                      {formatDateTime(mov.fecha)}
                    </td>
                    <td className="px-4 py-2 text-wine-900">{flujoBodega(mov)}</td>
                    <td className="px-4 py-2 tabular-nums text-wine-900">{formatDecimal(mov.cantidad)}</td>
                    <td className="px-4 py-2 text-wine-700">{mov.notas || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
