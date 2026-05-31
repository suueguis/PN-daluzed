import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Confirm from '../../components/ui/Confirm';
import {
  useMateriasPrimasQuery,
  useCreateMP,
  useUpdateMP,
  useDesactivarMP,
  useUnidadesQuery,
  useImportarCatalogo,
} from '../../hooks/catalogo/useCatalogo';
import { Toolbar, ActionsCell, YesNo } from './_shared.jsx';
import { extractRows, useFilteredList, useSearch } from './_shared.js';
import MateriaPrimaForm from './MateriaPrimaForm';
import {
  emptyMpForm,
  mpRowToForm,
  mpFormToPayload,
  validateMpForm,
} from './mpForm';

const CATEGORIA_OPTS = [
  { value: '', label: 'Todas las categorías' },
  { value: 'GALLETERIA', label: 'Galletería' },
  { value: 'TORTA', label: 'Torta' },
  { value: 'BIZCOCHO', label: 'Bizcocho' },
  { value: 'GENERAL', label: 'General' },
];

export default function MateriasPrimasPage() {
  const { data, isLoading } = useMateriasPrimasQuery();
  const { data: unidadesData } = useUnidadesQuery();
  const unidades = extractRows(unidadesData);

  const createM = useCreateMP();
  const updateM = useUpdateMP();
  const desactivarM = useDesactivarMP();
  const importM = useImportarCatalogo();

  const search = useSearch();
  const [categoria, setCategoria] = useState('');

  const rows = extractRows(data);
  const filtered = useFilteredList(rows, search.debounced, ['nombre']);
  const finalRows = useMemo(
    () => (categoria ? filtered.filter((r) => r.categoria === categoria) : filtered),
    [filtered, categoria],
  );

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyMpForm());
  const [confirm, setConfirm] = useState(null);

  const fileInputRef = useRef(null);

  const open = (row) => {
    setEditing(row || { id: null });
    setForm(mpRowToForm(row));
  };
  const close = () => setEditing(null);

  const submit = () => {
    const err = validateMpForm(form);
    if (err) {
      toast.error(err);
      return;
    }
    const payload = mpFormToPayload(form);
    const after = (msg) => {
      toast.success(msg);
      close();
    };
    if (editing?.id) {
      updateM.mutate(
        { id: editing.id, data: payload },
        { onSuccess: () => after('Materia prima actualizada'), onError: (e) => toast.error(e?.response?.data?.detail || 'Error al guardar') },
      );
    } else {
      createM.mutate(payload, {
        onSuccess: () => after('Materia prima creada'),
        onError: (e) => toast.error(e?.response?.data?.detail || 'Error al crear'),
      });
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importM.mutate(
      { file, tipo: 'materias_primas' },
      {
        onSuccess: (res) => {
          const procesados = res?.procesados ?? 0;
          const creados = res?.creados ?? 0;
          const errores = Array.isArray(res?.errores) ? res.errores : [];
          if (errores.length) {
            toast.warning(`Procesados: ${procesados} · Creados: ${creados} · Errores: ${errores.length}`, {
              description: errores.slice(0, 5).map((er) => `Fila ${er.fila}: ${er.error}`).join('\n'),
            });
          } else {
            toast.success(`Importación OK · Procesados ${procesados} · Creados ${creados}`);
          }
        },
        onError: (er) => toast.error(er?.response?.data?.detail || 'Error al importar'),
      },
    );
    e.target.value = '';
  };

  const triggerImport = () => fileInputRef.current?.click();

  return (
    <>
      <Toolbar
        searchValue={search.input}
        onSearchChange={search.setInput}
        onNew={() => open(null)}
        newLabel="Nueva materia prima"
        searchPlaceholder="Nombre…"
        extras={
          <>
            <div className="w-56">
              <Select
                label="Categoría"
                name="categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                options={CATEGORIA_OPTS}
              />
            </div>
            <Button
              variant="secondary"
              onClick={triggerImport}
              disabled={importM.isPending}
            >
              {importM.isPending ? 'Importando…' : 'Importar Excel'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              data-testid="mp-import-input"
              onChange={handleImport}
            />
          </>
        }
      />

      <Table
        loading={isLoading}
        data={finalRows}
        emptyTitle="Sin materias primas"
        columns={[
          { key: 'nombre', header: 'Nombre' },
          { key: 'categoria', header: 'Categoría' },
          {
            key: 'unidad',
            header: 'Unidad',
            render: (r) => r.unidad_medida_detalle?.simbolo || '—',
          },
          { key: 'punto_reorden', header: 'Punto reorden' },
          {
            key: 'condicion_almacenamiento',
            header: 'Almacenamiento',
            render: (r) => r.condicion_almacenamiento,
          },
          { key: 'activo', header: 'Estado', render: (r) => <YesNo value={r.activo} /> },
          {
            key: 'acciones',
            header: 'Acciones',
            render: (r) => (
              <ActionsCell
                onEdit={() => open(r)}
                onDelete={() => setConfirm(r)}
                deleteLabel="Desactivar"
              />
            ),
          },
        ]}
      />

      <Modal
        open={!!editing}
        onClose={close}
        title={editing?.id ? 'Editar materia prima' : 'Nueva materia prima'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancelar</Button>
            <Button onClick={submit} disabled={createM.isPending || updateM.isPending}>
              {createM.isPending || updateM.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <MateriaPrimaForm value={form} onChange={setForm} unidades={unidades} />
      </Modal>

      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        loading={desactivarM.isPending}
        title="Desactivar materia prima"
        message={`¿Desactivar "${confirm?.nombre}"? Si tiene stock activo, la operación se rechazará.`}
        confirmLabel="Desactivar"
        onConfirm={() =>
          desactivarM.mutate(confirm.id, {
            onSuccess: () => {
              toast.success('Materia prima desactivada');
              setConfirm(null);
            },
            onError: (e) => toast.error(e?.response?.data?.detail || 'No se pudo desactivar'),
          })
        }
      />
    </>
  );
}
