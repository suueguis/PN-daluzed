import { useState } from 'react';
import { useLotes, useBodegas, useTrazabilidad } from '../../hooks/inventario/useInventario';
import { getVencimientoTone, getVencimientoLabel } from '../../utils/vencimiento';
import { useApiQuery } from '../../hooks/useApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { formatDate, formatDecimal, formatDateTime } from '../../utils/formatters';
import DevolucionForm from './DevolucionForm';
import DescarteForm from './DescarteForm';

const VENCIMIENTO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'vencidos', label: 'Vencidos' },
  { value: '7',  label: 'Próximos 7 días' },
  { value: '30', label: 'Próximos 30 días' },
];

const TIPO_LABEL = {
  RECEPCION:  { label: 'Recepción',  tone: 'success' },
  TRASLADO:   { label: 'Traslado',   tone: 'info'    },
  CONSUMO:    { label: 'Consumo',    tone: 'warning'  },
  DEVOLUCION: { label: 'Devolución', tone: 'neutral'  },
  DESCARTE:   { label: 'Descarte',   tone: 'danger'   },
  AJUSTE:     { label: 'Ajuste',     tone: 'neutral'  },
};

function flujoBodega(mov) {
  if (mov.bodega_origen_nombre && mov.bodega_destino_nombre) {
    return `${mov.bodega_origen_nombre} → ${mov.bodega_destino_nombre}`;
  }
  return mov.bodega_destino_nombre ?? mov.bodega_origen_nombre ?? '—';
}

function LoteExpandido({ lote }) {
  const { data, isLoading } = useTrazabilidad(lote.id);
  const movimientos = data?.movimientos ?? [];

  return (
    <div className="space-y-4 p-4">
      {/* Metadata del lote */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-wine-700/70">Número de lote</p>
          <p className="text-wine-900">{lote.numero_lote || `#${lote.id}`}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-wine-700/70">Fecha de entrada</p>
          <p className="text-wine-900">{lote.fecha_entrada ? formatDate(lote.fecha_entrada) : '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-wine-700/70">Fecha de vencimiento</p>
          <p className="text-wine-900">{formatDate(lote.fecha_vencimiento)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-wine-700/70">Proveedor</p>
          <p className="text-wine-900">{lote.proveedor_nombre ?? '—'}</p>
        </div>
      </div>

      {/* Historial de movimientos */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-wine-700">Historial de movimientos</p>
        {isLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : movimientos.length === 0 ? (
          <p className="text-sm text-wine-700/60">Sin movimientos registrados.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-peach-200">
            <table className="w-full text-sm">
              <thead className="bg-cream-100">
                <tr>
                  {['Tipo', 'Fecha', 'Bodega', 'Cantidad', 'Notas'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-wine-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimientos.map((mov) => {
                  const { label, tone } = TIPO_LABEL[mov.tipo] ?? { label: mov.tipo, tone: 'neutral' };
                  return (
                    <tr key={mov.id} className="border-t border-peach-200/60 hover:bg-cream-50">
                      <td className="px-3 py-2"><Badge tone={tone}>{label}</Badge></td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap text-wine-900">{formatDateTime(mov.fecha)}</td>
                      <td className="px-3 py-2 text-wine-900">{flujoBodega(mov)}</td>
                      <td className="px-3 py-2 tabular-nums text-wine-900">{formatDecimal(mov.cantidad)}</td>
                      <td className="px-3 py-2 text-wine-700">{mov.notas || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const COL_COUNT = 8;

export default function LotesPage() {
  const [mpFiltro, setMpFiltro] = useState('');
  const [bodegaFiltro, setBodegaFiltro] = useState('');
  const [vencFiltro, setVencFiltro] = useState('');
  const [loteAccion, setLoteAccion] = useState(null);
  const [modal, setModal] = useState(null); // 'devolucion' | 'descarte'
  const [expandedLoteId, setExpandedLoteId] = useState(null);

  const params = {};
  if (mpFiltro) params.materia_prima = mpFiltro;
  if (bodegaFiltro) params.bodega = bodegaFiltro;
  if (vencFiltro === 'vencidos') {
    params.vence_antes_de = new Date().toISOString().split('T')[0];
  } else if (vencFiltro) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(vencFiltro, 10));
    params.vence_antes_de = d.toISOString().split('T')[0];
  }

  const { data: lotes = [], isLoading } = useLotes(params);
  const { data: bodegas = [] } = useBodegas();
  const { data: mps = [] } = useApiQuery(['catalogo', 'materias-primas'], '/catalogo/materias-primas/');

  const mpOptions = [{ value: '', label: 'Todas las MPs' }, ...mps.map((m) => ({ value: m.id, label: m.nombre }))];
  const bodegaOptions = [{ value: '', label: 'Todas las bodegas' }, ...bodegas.map((b) => ({ value: b.id, label: b.nombre }))];

  function abrirAccion(lote, tipo) {
    setLoteAccion(lote);
    setModal(tipo);
  }

  function cerrarModal() {
    setLoteAccion(null);
    setModal(null);
  }

  function toggleExpansion(loteId) {
    setExpandedLoteId((prev) => (prev === loteId ? null : loteId));
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Select
          options={mpOptions}
          value={mpFiltro}
          onChange={(e) => setMpFiltro(e.target.value)}
          placeholder="Filtrar por materia prima…"
          className="min-w-48"
          aria-label="Filtrar por materia prima"
        />
        <Select
          options={bodegaOptions}
          value={bodegaFiltro}
          onChange={(e) => setBodegaFiltro(e.target.value)}
          placeholder="Filtrar por bodega…"
          className="min-w-40"
          aria-label="Filtrar por bodega"
        />
        <Select
          options={VENCIMIENTO_OPTIONS}
          value={vencFiltro}
          onChange={(e) => setVencFiltro(e.target.value)}
          className="min-w-40"
        />
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
      ) : lotes.length === 0 ? (
        <EmptyState title="Sin lotes" description="No hay lotes que coincidan con los filtros." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-peach-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-100">
                <tr>
                  {['# Lote', 'Materia Prima', 'Bodega', 'Cantidad', 'Vencimiento', 'Estado', 'Detalle', 'Acciones'].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-wine-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lotes.map((lote) => {
                  const isExpanded = expandedLoteId === lote.id;
                  return (
                    <>
                      <tr key={lote.id} className="border-t border-peach-200/60 hover:bg-cream-50">
                        <td className="px-4 py-3 tabular-nums text-wine-700">
                          {lote.numero_lote || `#${lote.id}`}
                        </td>
                        <td className="px-4 py-3 text-wine-900">{lote.materia_prima_nombre}</td>
                        <td className="px-4 py-3 text-wine-900">{lote.bodega_nombre}</td>
                        <td className="px-4 py-3 tabular-nums text-wine-900">{formatDecimal(lote.cantidad)}</td>
                        <td className="px-4 py-3 tabular-nums text-wine-900">{formatDate(lote.fecha_vencimiento)}</td>
                        <td className="px-4 py-3">
                          <Badge tone={getVencimientoTone(lote.fecha_vencimiento)}>
                            {getVencimientoLabel(lote.fecha_vencimiento)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? `Contraer detalle de lote ${lote.numero_lote || lote.id}` : `Expandir detalle de lote ${lote.numero_lote || lote.id}`}
                            onClick={() => toggleExpansion(lote.id)}
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-wine-700 hover:bg-peach-100 focus:outline-none focus:ring-2 focus:ring-rose-300 transition-colors"
                          >
                            {isExpanded ? '▲ Cerrar' : '▼ Ver detalle'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => abrirAccion(lote, 'devolucion')}>
                              Devolver
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => abrirAccion(lote, 'descarte')}>
                              Descartar
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${lote.id}-expansion`} className="border-t border-peach-200/60 bg-cream-50/60">
                          <td colSpan={COL_COUNT} className="p-0">
                            <LoteExpandido lote={lote} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal devolución */}
      <Modal
        open={modal === 'devolucion'}
        onClose={cerrarModal}
        title="Registrar Devolución"
        size="md"
      >
        {loteAccion && (
          <DevolucionForm lote={loteAccion} onSuccess={cerrarModal} onCancel={cerrarModal} />
        )}
      </Modal>

      {/* Modal descarte */}
      <Modal
        open={modal === 'descarte'}
        onClose={cerrarModal}
        title="Registrar Descarte"
        size="sm"
      >
        {loteAccion && (
          <DescarteForm lote={loteAccion} onSuccess={cerrarModal} onCancel={cerrarModal} />
        )}
      </Modal>
    </div>
  );
}
