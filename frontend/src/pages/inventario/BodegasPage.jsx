import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useBodegas, useCreateBodega, useUpdateBodega, useDeleteBodega } from '../../hooks/inventario/useInventario';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

const TIPO_OPTIONS = [
  { value: 'PRINCIPAL', label: 'Bodega Principal' },
  { value: 'PDP', label: 'Punto de Producción (PDP)' },
];

const schema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  tipo: z.enum(['PRINCIPAL', 'PDP'], { message: 'Selecciona un tipo' }),
});

function BodegaForm({ initial, onSuccess, onCancel }) {
  const isEdit = !!initial;
  const createMut = useCreateBodega();
  const updateMut = useUpdateBodega();
  const mut = isEdit ? updateMut : createMut;

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { nombre: '', tipo: 'PRINCIPAL' },
  });

  async function onSubmit(values) {
    try {
      await mut.mutateAsync(isEdit ? { id: initial.id, ...values } : values);
      toast.success(isEdit ? 'Bodega actualizada' : 'Bodega creada');
      onSuccess();
    } catch {
      toast.error('Error al guardar la bodega');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nombre" {...register('nombre')} error={errors.nombre?.message} />
      <Select
        label="Tipo"
        options={TIPO_OPTIONS}
        {...register('tipo')}
        error={errors.tipo?.message}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}

export default function BodegasPage() {
  const [modal, setModal] = useState(null); // null | 'new' | { ...bodega }
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: bodegas = [], isLoading } = useBodegas();
  const deleteMut = useDeleteBodega();

  async function handleDelete(id) {
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Bodega eliminada');
      setConfirmDelete(null);
    } catch {
      toast.error('No se puede eliminar esta bodega');
    }
  }

  const columns = [
    { key: 'nombre', header: 'Nombre', render: (b) => b.nombre },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (b) => (
        <Badge tone={b.tipo === 'PRINCIPAL' ? 'info' : 'success'}>
          {b.tipo === 'PRINCIPAL' ? 'Principal' : 'PDP'}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (b) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setModal(b)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => setConfirmDelete(b)}>Eliminar</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModal('new')}>+ Nueva Bodega</Button>
      </div>

      <Table
        columns={columns}
        data={bodegas}
        loading={isLoading}
        emptyTitle="Sin bodegas"
        emptyDescription="Crea la primera bodega."
        getRowKey={(b) => b.id}
      />

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'Nueva Bodega' : 'Editar Bodega'}
      >
        <BodegaForm
          initial={modal !== 'new' ? modal : undefined}
          onSuccess={() => setModal(null)}
          onCancel={() => setModal(null)}
        />
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Confirmar eliminación"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => handleDelete(confirmDelete.id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-wine-900">
          ¿Eliminar la bodega <strong>{confirmDelete?.nombre}</strong>? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
