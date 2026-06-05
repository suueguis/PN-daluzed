import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reporteSemanalAPI } from '../../api/indicadoresAPI';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

const today = new Date().toISOString().slice(0, 10);
const fourWeeksAgo = new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10);

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportesPage() {
  const [desde, setDesde] = useState(fourWeeksAgo);
  const [hasta, setHasta] = useState(today);
  const [descargando, setDescargando] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reporte-semanal', desde, hasta],
    queryFn: () => reporteSemanalAPI.get({ desde, hasta }),
    enabled: !!desde && !!hasta,
  });

  const semanas = data?.semanas ?? [];

  async function handleDescargar() {
    setDescargando(true);
    try {
      const { data: blob } = await reporteSemanalAPI.descargarExcel(desde, hasta);
      triggerDownload(blob, `reporte_semanal_${desde}_${hasta}.xlsx`);
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-peach-200 bg-cream-50 p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="rpt-desde" className="text-xs font-semibold text-wine-700">
            Desde
          </label>
          <input
            id="rpt-desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            placeholder="ej. 2026-05-01"
            className="rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm text-wine-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rpt-hasta" className="text-xs font-semibold text-wine-700">
            Hasta
          </label>
          <input
            id="rpt-hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            placeholder="ej. 2026-06-01"
            className="rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm text-wine-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <Button onClick={() => refetch()}>Consultar</Button>
        <Button
          variant="secondary"
          disabled={descargando || semanas.length === 0}
          onClick={handleDescargar}
        >
          {descargando ? '…' : 'Exportar Excel'}
        </Button>
      </div>

      {/* Resultados */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="rounded-2xl border border-peach-200 bg-cream-50 px-5 py-4 text-sm text-wine-700">
          No se pudo cargar el reporte.
        </p>
      ) : semanas.length === 0 ? (
        <p className="rounded-2xl border border-peach-200 bg-cream-50 px-5 py-4 text-sm text-wine-700">
          Sin operaciones en el rango seleccionado.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-peach-200 bg-white">
          <table className="w-full text-sm" aria-label="Reporte semanal de operaciones">
            <thead className="bg-cream-100">
              <tr>
                {['Semana (inicio)', 'Batidos', 'Recepciones', 'Despachos', 'Unidades despachadas'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-wine-700"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {semanas.map((sem) => (
                <tr key={sem.semana_inicio} className="border-t border-peach-200/60 hover:bg-cream-50">
                  <td className="px-4 py-3 tabular-nums text-wine-900">{sem.semana_inicio}</td>
                  <td className="px-4 py-3 tabular-nums text-wine-900">{sem.batidos}</td>
                  <td className="px-4 py-3 tabular-nums text-wine-900">{sem.recepciones}</td>
                  <td className="px-4 py-3 tabular-nums text-wine-900">{sem.despachos}</td>
                  <td className="px-4 py-3 tabular-nums text-wine-900">{parseFloat(sem.unidades_despachadas).toLocaleString('es-CO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
