import { useMemo, useState } from 'react';
import { cn } from '../../utils/cn';
import EmptyState from './EmptyState';
import Spinner from './Spinner';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  pageSize = 10,
  emptyTitle = 'Sin resultados',
  emptyDescription,
  getRowKey,
  className,
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  const rows = useMemo(() => {
    const start = safePage * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-peach-200 bg-white', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-wine-700',
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={getRowKey ? getRowKey(row) : (row.id ?? idx)}
                className="border-t border-peach-200/60 hover:bg-cream-50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('px-4 py-3 text-wine-900', col.cellClassName)}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-peach-200 bg-cream-50 px-4 py-2 text-xs text-wine-700">
          <span>
            Página {safePage + 1} de {totalPages} · {data.length} registros
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-lg px-2 py-1 hover:bg-peach-200 disabled:opacity-40"
            >
              ‹ Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="rounded-lg px-2 py-1 hover:bg-peach-200 disabled:opacity-40"
            >
              Siguiente ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
