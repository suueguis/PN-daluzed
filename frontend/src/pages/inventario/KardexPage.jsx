import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useApiQuery } from '../../hooks/useApi';
import { useKardex } from '../../hooks/inventario/useInventario';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { formatDate, formatDecimal } from '../../utils/formatters';
import { formatApiError } from '../../utils/formatApiError';

const TIPO_TONE = {
  RECEPCION:  'success',
  TRASLADO:   'info',
  CONSUMO:    'warning',
  DEVOLUCION: 'danger',
  DESCARTE:   'danger',
};

const TIPO_LABEL = {
  RECEPCION:  'Recepción',
  TRASLADO:   'Traslado',
  CONSUMO:    'Consumo',
  DEVOLUCION: 'Devolución',
  DESCARTE:   'Descarte',
};

export default function KardexPage() {
  const [mpId, setMpId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const { data: mps = [] } = useApiQuery(['catalogo', 'materias-primas'], '/catalogo/materias-primas/');
  const mpOptions = [
    { value: '', label: 'Selecciona una materia prima…' },
    ...mps.map((m) => ({ value: String(m.id), label: m.nombre })),
  ];

  const params = mpId ? { materia_prima: mpId, ...(desde && { desde }), ...(hasta && { hasta }) } : null;
  const { data: rows = [], isLoading, isError, error } = useKardex(params);

  useEffect(() => {
    if (isError) toast.error(formatApiError(error, 'No se pudo cargar el kardex'));
  }, [isError, error]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-64">
          <Select
            label="Materia prima"
            options={mpOptions}
            value={mpId}
            onChange={(e) => setMpId(e.target.value)}
          />
        </div>
        <Input
          label="Desde"
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="w-40"
        />
        <Input
          label="Hasta"
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="w-40"
        />
      </div>

      {!mpId && (
        <EmptyState
          title="Selecciona una materia prima"
          message="El kardex muestra los movimientos y el saldo acumulado de una MP."
        />
      )}

      {mpId && isLoading && (
        <div className="flex justify-center py-8"><Spinner /></div>
      )}

      {mpId && !isLoading && rows.length === 0 && (
        <EmptyState title="Sin movimientos" message="No hay movimientos para los filtros seleccionados." />
      )}

      {mpId && !isLoading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-peach-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-peach-200 bg-cream-50">
                {['Fecha', 'Tipo', 'Lote', 'Bodega origen', 'Bodega destino', 'Cantidad', 'Saldo'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-wine-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-peach-200/60 hover:bg-cream-50">
                  <td className="px-4 py-3 text-wine-700">{formatDate(row.fecha)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={TIPO_TONE[row.tipo] ?? 'neutral'}>
                      {TIPO_LABEL[row.tipo] ?? row.tipo}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-wine-900 tabular-nums">{row.numero_lote || `#${row.lote}`}</td>
                  <td className="px-4 py-3 text-wine-700">{row.bodega_origen_nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-wine-700">{row.bodega_destino_nombre ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums text-wine-900">{formatDecimal(row.cantidad)}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-wine-900">{formatDecimal(row.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
