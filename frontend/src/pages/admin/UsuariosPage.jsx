import { useState } from 'react';
import { toast } from 'sonner';
import { formatApiError } from '../../utils/formatApiError';
import useAuthStore from '../../store/authStore';
import {
  useUsuariosQuery,
  useCreateUsuario,
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

function emptyForm() {
  return { email: '', password: '', role: 'INVENTARIO' };
}

export default function UsuariosPage() {
  const { user: currentUser } = useAuthStore();
  const { data: usuarios = [], isLoading } = useUsuariosQuery();
  const createM = useCreateUsuario();
  const desactivarM = useDesactivarUsuario();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});

  const [targetUser, setTargetUser] = useState(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.email.trim()) errs.email = 'Requerido';
    if (!form.password) errs.password = 'Requerido';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    createM.mutate(form, {
      onSuccess: () => {
        toast.success('Usuario creado');
        setCreateOpen(false);
        setForm(emptyForm());
      },
      onError: (err) => toast.error(formatApiError(err, 'No se pudo crear el usuario')),
    });
  };

  const handleDesactivar = () => {
    if (!targetUser) return;
    desactivarM.mutate(targetUser.id, {
      onSuccess: () => {
        toast.success(`${targetUser.email} desactivado`);
        setTargetUser(null);
      },
      onError: (err) => {
        toast.error(formatApiError(err, 'No se pudo desactivar el usuario'));
        setTargetUser(null);
      },
    });
  };

  const columns = [
    { key: 'email',   header: 'Email' },
    {
      key: 'role',
      header: 'Rol',
      render: (row) => ROLE_LABELS[row.role] ?? row.role,
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (row) => (
        <Badge state={row.is_active ? 'ACTIVO' : 'INACTIVO'} />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => {
        const isSelf = row.email === currentUser?.username;
        if (!row.is_active || isSelf) return null;
        return (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setTargetUser(row)}
          >
            Desactivar
          </Button>
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
        onClose={() => { setCreateOpen(false); setForm(emptyForm()); setErrors({}); }}
        title="Nuevo usuario"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setForm(emptyForm()); setErrors({}); }}>
              Cancelar
            </Button>
            <Button type="submit" form="form-create-usuario" loading={createM.isPending}>
              {createM.isPending ? 'Creando…' : 'Crear usuario'}
            </Button>
          </>
        }
      >
        <form id="form-create-usuario" onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            name="email"
            value={form.email}
            onChange={set('email')}
            placeholder="ej. ana@daluzed.com"
            error={errors.email}
            autoFocus
          />
          <Input
            label="Contraseña temporal"
            type="password"
            name="password"
            value={form.password}
            onChange={set('password')}
            placeholder="Mínimo 8 caracteres"
            error={errors.password}
          />
          <Select
            label="Rol"
            name="role"
            value={form.role}
            onChange={set('role')}
            options={ROLES}
          />
        </form>
      </Modal>

      {/* Confirm desactivar */}
      <ConfirmDialog
        open={!!targetUser}
        onClose={() => setTargetUser(null)}
        onConfirm={handleDesactivar}
        title="Desactivar usuario"
        description={`${targetUser?.email} no podrá iniciar sesión. Esta acción es reversible desde la base de datos.`}
        confirmWord={targetUser?.email}
        confirmLabel="Desactivar"
        loading={desactivarM.isPending}
      />
    </>
  );
}
