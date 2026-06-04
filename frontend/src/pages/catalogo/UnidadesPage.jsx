import { useState } from 'react';
import { toast } from 'sonner';
import { formatApiError } from '../../utils/formatApiError';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import {
  useUnidadesQuery,
  useCreateUnidad,
  useUpdateUnidad,
} from '../../hooks/catalogo/useCatalogo';
import { Toolbar, ActionsCell, YesNo } from './_shared.jsx';
import { extractRows, useFilteredList, useSearch } from './_shared.js';

function emptyForm() {
  return { nombre: '', simbolo: '', activo: true };
}

export default function UnidadesPage() {
  const { data, isLoading } = useUnidadesQuery();
  const createM = useCreateUnidad();
  const updateM = useUpdateUnidad();

  const rows = extractRows(data);
  const search = useSearch();
  const filtered = useFilteredList(rows, search.debounced, ['nombre', 'simbolo']);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const open = (row) => {
    setEditing(row || { id: null });
    setForm(row ? { nombre: row.nombre, simbolo: row.simbolo, activo: row.activo } : emptyForm());
  };
  const close = () => setEditing(null);

  const submit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.simbolo.trim()) {
      toast.error('Nombre y símbolo son obligatorios');
      return;
    }
    const onOk = (msg) => {
      toast.success(msg);
      close();
    };
    if (editing?.id) {
      updateM.mutate(
        { id: editing.id, data: form },
        { onSuccess: () => onOk('Unidad actualizada'), onError: (err) => toast.error(formatApiError(err, 'No se pudo guardar la unidad')) },
      );
    } else {
      createM.mutate(form, {
        onSuccess: () => onOk('Unidad creada'),
        onError: (err) => toast.error(formatApiError(err, 'No se pudo crear la unidad')),
      });
    }
  };

  return (
    <>
      <Toolbar
        searchValue={search.input}
        onSearchChange={search.setInput}
        onNew={() => open(null)}
        newLabel="Nueva unidad"
        searchPlaceholder="Nombre o símbolo…"
      />

      <Table
        loading={isLoading}
        data={filtered}
        emptyTitle="Sin unidades"
        columns={[
          { key: 'nombre', header: 'Nombre' },
          { key: 'simbolo', header: 'Símbolo' },
          {
            key: 'activo',
            header: 'Estado',
            render: (r) => <YesNo value={r.activo} />,
          },
          {
            key: 'acciones',
            header: 'Acciones',
            render: (r) => <ActionsCell onEdit={() => open(r)} />,
          },
        ]}
      />

      <Modal
        open={!!editing}
        onClose={close}
        title={editing?.id ? 'Editar unidad' : 'Nueva unidad'}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={createM.isPending || updateM.isPending}>
              {createM.isPending || updateM.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Input
            label="Nombre"
            name="nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <Input
            label="Símbolo"
            name="simbolo"
            value={form.simbolo}
            onChange={(e) => setForm({ ...form, simbolo: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-wine-900">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Activo
          </label>
        </form>
      </Modal>
    </>
  );
}
