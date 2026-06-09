import { useState } from 'react';
import { toast } from 'sonner';
import { formatApiError } from '../../utils/formatApiError';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Confirm from '../../components/ui/Confirm';
import {
  useProductosQuery,
  useCreateProducto,
  useUpdateProducto,
  useUnidadesQuery,
} from '../../hooks/catalogo/useCatalogo';
import { Toolbar, ActionsCell, YesNo } from './_shared.jsx';
import { extractRows, useFilteredList, useSearch } from './_shared.js';

function emptyForm() {
  return { nombre: '', vida_util_dias: '', unidad_medida: '', activo: true };
}

export default function ProductosTerminadosPage() {
  const { data, isLoading } = useProductosQuery();
  const { data: unidadesData } = useUnidadesQuery();
  const unidades = extractRows(unidadesData);

  const createM = useCreateProducto();
  const updateM = useUpdateProducto();

  const rows = extractRows(data);
  const search = useSearch();
  const filtered = useFilteredList(rows, search.debounced, ['nombre', 'codigo']);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [confirmToggle, setConfirmToggle] = useState(null);

  const open = (row) => {
    setEditing(row || { id: null });
    setForm(
      row
        ? {
            nombre: row.nombre,
            vida_util_dias: String(row.vida_util_dias ?? ''),
            unidad_medida: row.unidad_medida ?? '',
            activo: row.activo,
          }
        : emptyForm(),
    );
  };
  const close = () => setEditing(null);

  const submit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return toast.error('Nombre obligatorio');
    if (!form.unidad_medida) return toast.error('Selecciona una unidad');
    if (!form.vida_util_dias || Number(form.vida_util_dias) <= 0)
      return toast.error('Vida útil en días debe ser > 0');

    const payload = {
      nombre: form.nombre.trim(),
      vida_util_dias: Number(form.vida_util_dias),
      unidad_medida: Number(form.unidad_medida),
      activo: form.activo,
    };
    const after = (msg) => {
      toast.success(msg);
      close();
    };
    if (editing?.id) {
      updateM.mutate(
        { id: editing.id, data: payload },
        { onSuccess: () => after('Producto actualizado'), onError: (err) => toast.error(formatApiError(err, 'No se pudo guardar el producto')) },
      );
    } else {
      createM.mutate(payload, {
        onSuccess: () => after('Producto creado'),
        onError: (err) => toast.error(formatApiError(err, 'No se pudo crear el producto')),
      });
    }
  };

  return (
    <>
      <Toolbar
        searchValue={search.input}
        onSearchChange={search.setInput}
        onNew={() => open(null)}
        newLabel="Nuevo producto"
        searchPlaceholder="Código o nombre…"
      />

      <Table
        loading={isLoading}
        data={filtered}
        emptyTitle="Sin productos terminados"
        columns={[
          { key: 'codigo', header: 'Código' },
          { key: 'nombre', header: 'Nombre' },
          { key: 'vida_util_dias', header: 'Vida útil (días)' },
          { key: 'unidad', header: 'Unidad', render: (r) => r.unidad_medida_detalle?.simbolo || '—' },
          { key: 'activo', header: 'Estado', render: (r) => <YesNo value={r.activo} /> },
          {
            key: 'acciones',
            header: 'Acciones',
            render: (r) => (
              <ActionsCell
                onEdit={() => open(r)}
                onDelete={() => setConfirmToggle(r)}
                deleteLabel={r.activo ? 'Desactivar' : 'Activar'}
              />
            ),
          },
        ]}
      />

      <Modal
        open={!!editing}
        onClose={close}
        title={editing?.id ? 'Editar producto terminado' : 'Nuevo producto terminado'}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancelar</Button>
            <Button onClick={submit} disabled={createM.isPending || updateM.isPending}>
              {createM.isPending || updateM.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={submit}>
          <div className="sm:col-span-2">
            <Input
              label="Nombre"
              name="nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <Input
            label="Vida útil (días)"
            name="vida_util_dias"
            type="number"
            min="1"
            value={form.vida_util_dias}
            onChange={(e) => setForm({ ...form, vida_util_dias: e.target.value })}
          />
          <Select
            label="Unidad de medida"
            name="unidad_medida"
            placeholder="Selecciona unidad…"
            value={form.unidad_medida}
            onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
            options={unidades.map((u) => ({ value: u.id, label: `${u.nombre} (${u.simbolo})` }))}
          />
          <label className="flex items-center gap-2 text-sm text-wine-900 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Activo
          </label>
        </form>
      </Modal>

      <Confirm
        open={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        loading={updateM.isPending}
        title={confirmToggle?.activo ? 'Desactivar producto' : 'Activar producto'}
        message={
          confirmToggle?.activo
            ? `¿Desactivar "${confirmToggle?.nombre}"? El producto dejará de estar disponible para producción.`
            : `¿Activar "${confirmToggle?.nombre}"?`
        }
        confirmLabel={confirmToggle?.activo ? 'Desactivar' : 'Activar'}
        onConfirm={() =>
          updateM.mutate(
            { id: confirmToggle.id, data: { activo: !confirmToggle.activo } },
            {
              onSuccess: () => {
                toast.success(confirmToggle.activo ? 'Producto desactivado' : 'Producto activado');
                setConfirmToggle(null);
              },
              onError: (err) => {
                toast.error(formatApiError(err, 'No se pudo cambiar el estado'));
                setConfirmToggle(null);
              },
            },
          )
        }
      />
    </>
  );
}
