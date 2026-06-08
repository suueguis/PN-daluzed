import { useState } from 'react';
import { toast } from 'sonner';
import { formatApiError } from '../../utils/formatApiError';
import useAuthStore from '../../store/authStore';
import {
  useUsuariosQuery,
  useCreateUsuario,
  usePatchUsuario,
  useDesactivarUsuario,
} from '../../hooks/auth/useUsuarios';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const ROLES = [
  { value: 'ADMIN',      label: 'Administrador' },
  { value: 'GERENTE',    label: 'Gerencia' },
  { value: 'PRODUCCION', label: 'Jefe de Producción' },
  { value: 'INVENTARIO', label: 'Encargado de Inventarios' },
];

const ROLE_LABELS = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

function emptyCreateForm() {
  return { email: '', password: '', role: 'INVENTARIO' };
}

export default function UsuariosPage() {
  const { user: currentUser } = useAuthStore();
  const { data: usuarios = [], isLoading } = useUsuariosQuery();
  const createM     = useCreateUsuario();
  const patchM      = usePatchUsuario();
  const desactivarM = useDesactivarUsuario();

  // ── Crear usuario ─────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm());
  const [createErrors, setCreateErrors] = useState({});

  const setCreate = (field) => (e) => setCreateForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = (e) => {
    e.preventDefault();
    const errs = {};
    if (!createForm.email.trim()) errs.email = 'Requerido';
    if (!createForm.password)     errs.password = 'Requerido';
    if (Object.keys(errs).length) { setCreateErrors(errs); return; }
    setCreateErrors({});
    createM.mutate(createForm, {
      onSuccess: () => {
        toast.success('Usuario creado');
        setCreateOpen(false);
        setCreateForm(emptyCreateForm());
      },
      onError: (err) => toast.error(formatApiError(err, 'No se pudo crear el usuario')),
    });
  };

  // ── Editar usuario ────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState(null);
  const [editRole, setEditRole]     = useState('INVENTARIO');

  const openEdit = (row) => {
    setEditTarget(row);
    setEditRole(row.role);
  };
  const closeEdit = () => setEditTarget(null);

  const handleEdit = () => {
    if (!editTarget) return;
    patchM.mutate(
      { id: editTarget.id, data: { role: editRole } },
      {
        onSuccess: () => {
          toast.success('Rol actualizado');
          closeEdit();
        },
        onError: (err) => toast.error(formatApiError(err, 'No se pudo actualizar el usuario')),
      },
    );
  };

  // ── Activar usuario ───────────────────────────────────────────────
  const handleActivar = (row) => {
    patchM.mutate(
      { id: row.id, data: { is_active: true } },
      {
        onSuccess: () => toast.success(`${row.email} activado`),
        onError: (err) => toast.error(formatApiError(err, 'No se pudo activar el usuario')),
      },
    );
  };

  // ── Desactivar usuario ────────────────────────────────────────────
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const handleDesactivar = () => {
    if (!deactivateTarget) return;
    desactivarM.mutate(deactivateTarget.id, {
      onSuccess: () => {
        toast.success(`${deactivateTarget.email} desactivado`);
        setDeactivateTarget(null);
      },
      onError: (err) => {
        toast.error(formatApiError(err, 'No se pudo desactivar el usuario'));
        setDeactivateTarget(null);
      },
    });
  };

  const columns = [
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Rol',
      render: (row) => ROLE_LABELS[row.role] ?? row.role,
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (row) => (
        <Badge tone={row.is_active ? 'success' : 'neutral'}>
          {row.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => {
        const isSelf = row.email === currentUser?.username;
        if (isSelf) return <span className="text-xs text-wine-600">(tu cuenta)</span>;
        return (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>
              Editar rol
            </Button>
            {row.is_active ? (
              <Button variant="danger" size="sm" onClick={() => setDeactivateTarget(row)}>
                Desactivar
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => handleActivar(row)} disabled={patchM.isPending}>
                Activar
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-wine-900">Usuarios del sistema</h1>
        <Button onClick={() => setCreateOpen(true)}>Nuevo usuario</Button>
      </div>

      <Table
        loading={isLoading}
        data={usuarios}
        columns={columns}
        emptyTitle="Sin usuarios"
        emptyMessage="Crea el primer usuario del sistema."
      />

      {/* Modal crear usuario */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateForm(emptyCreateForm()); setCreateErrors({}); }}
        title="Nuevo usuario"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setCreateForm(emptyCreateForm()); setCreateErrors({}); }}>
              Cancelar
            </Button>
            <Button type="submit" form="form-create-usuario" disabled={createM.isPending}>
              {createM.isPending ? 'Creando…' : 'Crear usuario'}
            </Button>
          </>
        }
      >
        <form id="form-create-usuario" onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Correo electrónico"
            type="email"
            name="email"
            value={createForm.email}
            onChange={setCreate('email')}
            placeholder="ej. ana@daluzed.com"
            error={createErrors.email}
            autoFocus
          />
          <Input
            label="Contraseña temporal"
            type="password"
            name="new-password"
            autoComplete="new-password"
            value={createForm.password}
            onChange={setCreate('password')}
            placeholder="Mínimo 8 caracteres"
            error={createErrors.password}
          />
          <Select
            label="Rol"
            name="role"
            value={createForm.role}
            onChange={setCreate('role')}
            options={ROLES}
          />
        </form>
      </Modal>

      {/* Modal editar rol */}
      <Modal
        open={!!editTarget}
        onClose={closeEdit}
        title={`Editar usuario — ${editTarget?.email ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={closeEdit}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={patchM.isPending}>
              {patchM.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-peach-200 bg-cream-50 px-4 py-3 text-sm text-wine-700">
            <p><span className="font-semibold">Correo:</span> {editTarget?.email}</p>
            <p><span className="font-semibold">Estado:</span> {editTarget?.is_active ? 'Activo' : 'Inactivo'}</p>
          </div>
          <Select
            label="Rol"
            name="edit-role"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
            options={ROLES}
          />
        </div>
      </Modal>

      {/* Confirm desactivar */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDesactivar}
        title="Desactivar usuario"
        description={`${deactivateTarget?.email} no podrá iniciar sesión. Puedes reactivarlo en cualquier momento desde esta misma pantalla.`}
        confirmWord={deactivateTarget?.email}
        confirmLabel="Desactivar"
        loading={desactivarM.isPending}
      />
    </>
  );
}
