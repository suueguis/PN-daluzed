import { useMemo, useState } from 'react';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import { useMateriasPrimasQuery } from '../../hooks/catalogo/useCatalogo';
import { Toolbar, YesNo } from './_shared.jsx';
import { extractRows, useFilteredList, useSearch } from './_shared.js';

export default function PresentacionesPage() {
  const { data, isLoading } = useMateriasPrimasQuery();
  const mps = extractRows(data);

  const search = useSearch();
  const [mpFilter, setMpFilter] = useState('');

  const flat = useMemo(() => {
    const out = [];
    for (const mp of mps) {
      for (const p of mp.presentaciones || []) {
        out.push({
          ...p,
          materia_prima_nombre: mp.nombre,
          materia_prima_id: mp.id,
        });
      }
    }
    return out;
  }, [mps]);

  const filtered = useFilteredList(flat, search.debounced, [
    'nombre',
    'materia_prima_nombre',
  ]);
  const final = useMemo(
    () =>
      mpFilter
        ? filtered.filter((p) => String(p.materia_prima_id) === String(mpFilter))
        : filtered,
    [filtered, mpFilter],
  );

  return (
    <>
      <Toolbar
        searchValue={search.input}
        onSearchChange={search.setInput}
        searchPlaceholder="Nombre o materia prima…"
        extras={
          <div className="w-full sm:w-64">
            <Select
              label="Materia prima"
              name="mp"
              value={mpFilter}
              onChange={(e) => setMpFilter(e.target.value)}
              options={[
                { value: '', label: 'Todas' },
                ...mps.map((m) => ({ value: m.id, label: m.nombre })),
              ]}
            />
          </div>
        }
      />

      <p className="mb-2 text-xs text-wine-700">
        Las presentaciones se gestionan desde cada materia prima en el backend. Vista de
        consulta solamente.
      </p>

      <Table
        loading={isLoading}
        data={final}
        emptyTitle="Sin presentaciones"
        getRowKey={(p) => `${p.materia_prima_id}-${p.id}`}
        columns={[
          { key: 'materia_prima_nombre', header: 'Materia prima' },
          { key: 'nombre', header: 'Presentación' },
          { key: 'factor_conversion', header: 'Factor conv.' },
          { key: 'costo', header: 'Costo' },
          { key: 'activo', header: 'Estado', render: (r) => <YesNo value={r.activo} /> },
        ]}
      />
    </>
  );
}
