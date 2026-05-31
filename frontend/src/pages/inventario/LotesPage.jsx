import { useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { useLotes, useBodegas } from '../../hooks/inventario/useInventario';
import { useApiQuery } from '../../hooks/useApi';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { formatDate, formatDecimal } from '../../utils/formatters';
import DevolucionForm from './DevolucionForm';
import DescarteForm from './DescarteForm';

const VENCIMIENTO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'vencidos', label: 'Vencidos' },
  { value: '7',  label: 'Próximos 7 días' },
  { value: '30', label: 'Próximos 30 días' },
];

function diasRestantes(fechaStr) {
  return differenceInDays(parseISO(fechaStr), new Date());
}

function vencimientoBadgeTone(dias) {
  if (dias < 0) return 'danger';
  if (dias <= 7) return 'warning';
  return 'success';
}

function vencimientoLabel(dias) {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)}d`;
  if (dias === 0) return 'Vence hoy';
  return `${dias}d restantes`;
}

export default function LotesPage() {
  const [mpFiltro, setMpFiltro] = useState('');
  const [bodegaFiltro, setBodegaFiltro] = useState('');
  const [vencFiltro, setVencFiltro] = useState('');
  const [loteAccion, setLoteAccion] = useState(null);
  const [modal, setModal] = useState(null); // 'devolucion' | 'descarte'

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

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Select
          options={mpOptions}
          value={mpFiltro}
          onChange={(e) => setMpFiltro(e.target.value)}
          placeholder="Materia Prima"
          className="min-w-48"
        />
        <Select
          options={bodegaOptions}
          value={bodegaFiltro}
          onChange={(e) => setBodegaFiltro(e.target.value)}
          placeholder="Bodega"
          className="min-w-40"
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
                  {['# Lote', 'Materia Prima', 'Bodega', 'Cantidad', 'Vencimiento', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-wine-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lotes.map((lote) => {
                  const dias = diasRestantes(lote.fecha_vencimiento);
                  return (
                    <tr key={lote.id} className="border-t border-peach-200/60 hover:bg-cream-50">
                      <td className="px-4 py-3 tabular-nums text-wine-700">
                        {lote.numero_lote || `#${lote.id}`}
                      </td>
                      <td className="px-4 py-3 text-wine-900">{lote.materia_prima_nombre}</td>
                      <td className="px-4 py-3 text-wine-900">{lote.bodega_nombre}</td>
                      <td className="px-4 py-3 tabular-nums text-wine-900">{formatDecimal(lote.cantidad)}</td>
                      <td className="px-4 py-3 tabular-nums text-wine-900">{formatDate(lote.fecha_vencimiento)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={vencimientoBadgeTone(dias)}>{vencimientoLabel(dias)}</Badge>
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
