import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLotes, useBodegas } from '../../hooks/inventario/useInventario';
import { useApiQuery } from '../../hooks/useApi';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { formatDecimal } from '../../utils/formatters';

export default function StockPage() {
  const navigate = useNavigate();

  const { data: lotes = [], isLoading: loadingLotes } = useLotes();
  const { data: bodegas = [], isLoading: loadingBodegas } = useBodegas();
  const { data: mps = [], isLoading: loadingMps } = useApiQuery(
    ['catalogo', 'materias-primas'],
    '/catalogo/materias-primas/',
  );

  const stockPivot = useMemo(() => {
    if (!mps.length || !bodegas.length) return [];

    const principalBodega = bodegas.find((b) => b.tipo === 'PRINCIPAL');
    const pdpBodegas = bodegas.filter((b) => b.tipo === 'PDP');

    return mps.map((mp) => {
      const mpLotes = lotes.filter((l) => l.materia_prima === mp.id);

      const bp = principalBodega
        ? mpLotes
            .filter((l) => l.bodega === principalBodega.id)
            .reduce((sum, l) => sum + parseFloat(l.cantidad), 0)
        : 0;

      const pdp = pdpBodegas.reduce((acc, b) => {
        const bStock = mpLotes
          .filter((l) => l.bodega === b.id)
          .reduce((sum, l) => sum + parseFloat(l.cantidad), 0);
        return acc + bStock;
      }, 0);

      const total = bp + pdp;
      const bajoPuntoReorden = bp <= parseFloat(mp.punto_reorden || 0);

      return { mp, bp, pdp, total, bajoPuntoReorden };
    });
  }, [mps, bodegas, lotes]);

  const isLoading = loadingLotes || loadingBodegas || loadingMps;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!stockPivot.length) {
    return (
      <p className="py-10 text-center text-sm text-wine-700">
        No hay materias primas registradas.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-peach-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-wine-700">
                Materia Prima
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-wine-700">
                Bodega Principal
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-wine-700">
                Bodega PDP
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-wine-700">
                Total
              </th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-wine-700" />
            </tr>
          </thead>
          <tbody>
            {stockPivot.map(({ mp, bp, pdp, total, bajoPuntoReorden }) => (
              <tr
                key={mp.id}
                className={`border-t border-peach-200/60 ${
                  bajoPuntoReorden ? 'bg-cherry-500/5' : 'hover:bg-cream-50'
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {bajoPuntoReorden && (
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-cherry-500"
                        title="Bajo punto de reorden"
                        aria-label="bajo-reorden"
                      />
                    )}
                    <span className={bajoPuntoReorden ? 'font-semibold text-cherry-500' : 'text-wine-900'}>
                      {mp.nombre}
                    </span>
                  </div>
                  {bajoPuntoReorden && (
                    <p className="mt-0.5 text-xs text-cherry-500">
                      Reorden: {formatDecimal(mp.punto_reorden)}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-wine-900">
                  {formatDecimal(bp)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-wine-900">
                  {formatDecimal(pdp)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-wine-900">
                  {formatDecimal(total)}
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/inventario/traslados?mp=${mp.id}`)}
                  >
                    Trasladar a PDP
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
