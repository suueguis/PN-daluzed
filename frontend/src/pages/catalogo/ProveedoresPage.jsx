import { useState } from 'react';
import { toast } from 'sonner';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import {
  useProveedoresQuery,
  useCreateProveedor,
  useUpdateProveedor,
} from '../../hooks/catalogo/useCatalogo';
import { Toolbar, ActionsCell, YesNo } from './_shared.jsx';
import { extractRows, useFilteredList, useSearch } from './_shared.js';

function emptyForm() {
  return { nombre: '', contacto: '', telefono: '', email: '', activo: true };
}

export default function ProveedoresPage() {
  const { data, isLoading } = useProveedoresQuery();
  const createM = useCreateProveedor();
  const updateM = useUpdateProveedor();

  const rows = extractRows(data);
  const search = useSearch();
  const filtered = useFilteredList(rows, search.debounced, ['nombre', 'contacto', 'email']);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const open = (row) => {
    setEditing(row || { id: null });
    setForm(
      row
        ? {
            nombre: row.nombre,
            contacto: row.contacto || '',
            telefono: row.telefono || '',
            email: row.email || '',
            activo: row.activo,
          }
        : emptyForm(),
    );
  };
  const close = () => setEditing(null);

  const submit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    const after = (msg) => {
      toast.success(msg);
      close();
    };
    if (editing?.id) {
      updateM.mutate(
        { id: editing.id, data: form },
        { onSuccess: () => after('Proveedor actualizado'), onError: () => toast.error('Error al guardar') },
      );
    } else {
      createM.mutate(form, {
        onSuccess: () => after('Proveedor creado'),
        onError: () => toast.error('Error al crear'),
      });
    }
  };

  const toggleActivo = (row) => {
    updateM.mutate(
      { id: row.id, data: { activo: !row.activo } },
      {
        onSuccess: () => toast.success(row.activo ? 'Proveedor desactivado' : 'Proveedor activado'),
        onError: () => toast.error('Error al cambiar estado'),
      },
    );
  };

  return (
    <>
      <Toolbar
        searchValue={search.input}
        onSearchChange={search.setInput}
        onNew={() => open(null)}
        newLabel="Nuevo proveedor"
        searchPlaceholder="Nombre, contacto o email…"
      />

      <Table
        loading={isLoading}
        data={filtered}
        emptyTitle="Sin proveedores"
        columns={[
          { key: 'nombre', header: 'Nombre' },
          { key: 'contacto', header: 'Contacto' },
          { key: 'telefono', header: 'Teléfono' },
          { key: 'email', header: 'Email' },
          { key: 'activo', header: 'Estado', render: (r) => <YesNo value={r.activo} /> },
          {
            key: 'acciones',
            header: 'Acciones',
            render: (r) => (
              <ActionsCell
                onEdit={() => open(r)}
                onDelete={() => toggleActivo(r)}
                deleteLabel={r.activo ? 'Desactivar' : 'Activar'}
              />
            ),
          },
        ]}
      />

      <Modal
        open={!!editing}
        onClose={close}
        title={editing?.id ? 'Editar proveedor' : 'Nuevo proveedor'}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancelar</Button>
            <Button onClick={submit} disabled={createM.isPending || updateM.isPending}>
              {createM.isPending || updateM.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Input label="Nombre" name="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Input label="Contacto" name="contacto" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
          <Input label="Teléfono" name="telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
