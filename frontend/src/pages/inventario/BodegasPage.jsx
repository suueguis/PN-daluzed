import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useBodegas, useCreateBodega, useUpdateBodega, useDeleteBodega } from '../../hooks/inventario/useInventario';
import { useZonas, useCreateZona, useUpdateZona, useDeleteZona } from '../../hooks/inventario/useZonas';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { formatApiError } from '../../utils/formatApiError';

const TIPO_OPTIONS = [
  { value: 'PRINCIPAL', label: 'Bodega Principal' },
  { value: 'PDP', label: 'Punto de Producción (PDP)' },
];

const bodegaSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  tipo: z.enum(['PRINCIPAL', 'PDP'], { message: 'Selecciona un tipo' }),
});

const zonaSchema = z.object({
  nombre:      z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().optional(),
});

// ── Formulario Bodega ─────────────────────────────────────────────────────────

function BodegaForm({ initial, onSuccess, onCancel }) {
  const isEdit = !!initial;
  const createMut = useCreateBodega();
  const updateMut = useUpdateBodega();
  const mut = isEdit ? updateMut : createMut;

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(bodegaSchema),
    defaultValues: initial ?? { nombre: '', tipo: 'PRINCIPAL' },
  });

  async function onSubmit(values) {
    try {
      await mut.mutateAsync(isEdit ? { id: initial.id, ...values } : values);
      toast.success(isEdit ? 'Bodega actualizada' : 'Bodega creada');
      onSuccess();
    } catch (err) {
      toast.error(formatApiError(err, 'No se pudo guardar la bodega'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nombre" {...register('nombre')} error={errors.nombre?.message} />
      <Select label="Tipo" options={TIPO_OPTIONS} {...register('tipo')} error={errors.tipo?.message} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}

// ── Formulario Zona ───────────────────────────────────────────────────────────

function ZonaForm({ bodegaId, initial, onSuccess, onCancel }) {
  const isEdit = !!initial;
  const createMut = useCreateZona();
  const updateMut = useUpdateZona();
  const mut = isEdit ? updateMut : createMut;

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(zonaSchema),
    defaultValues: initial ?? { nombre: '', descripcion: '' },
  });

  async function onSubmit(values) {
    try {
      const payload = { ...values, bodega: bodegaId };
      await mut.mutateAsync(isEdit ? { id: initial.id, ...payload } : payload);
      toast.success(isEdit ? 'Zona actualizada' : 'Zona creada');
      onSuccess();
    } catch (err) {
      toast.error(formatApiError(err, 'No se pudo guardar la zona'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nombre" placeholder="Ej: Estante A, Refrigeración" {...register('nombre')} error={errors.nombre?.message} />
      <Input label="Descripción (opcional)" {...register('descripcion')} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear zona'}
        </Button>
      </div>
    </form>
  );
}

// ── Panel de zonas por bodega ─────────────────────────────────────────────────

function ZonasPanel({ bodega }) {
  const [zonaModal, setZonaModal] = useState(null); // null | 'new' | zona
  const [confirmZonaDelete, setConfirmZonaDelete] = useState(null);

  const { data: zonas = [], isLoading } = useZonas(bodega.id);
  const deleteMut = useDeleteZona();

  async function handleDeleteZona(zona) {
    try {
      await deleteMut.mutateAsync({ id: zona.id, bodegaId: bodega.id });
      toast.success('Zona eliminada');
      setConfirmZonaDelete(null);
    } catch (err) {
      toast.error(formatApiError(err, 'No se pudo eliminar la zona'));
    }
  }

  return (
    <div className="border-t border-peach-200 bg-cream-50 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wide text-wine-700">
          Zonas ({zonas.length})
        </span>
        <Button size="sm" variant="ghost" onClick={() => setZonaModal('new')}>
          + Agregar zona
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
      ) : zonas.length === 0 ? (
        <p className="text-sm text-wine-700/70 italic">Sin zonas definidas.</p>
      ) : (
        <div className="space-y-1">
          {zonas.map((zona) => (
            <div key={zona.id} className="flex items-center justify-between rounded-xl bg-white border border-peach-200 px-3 py-2">
              <div>
                <span className="text-sm font-semibold text-wine-900">{zona.nombre}</span>
                {zona.descripcion && (
                  <span className="ml-2 text-xs text-wine-700/70">{zona.descripcion}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setZonaModal(zona)}>Editar</Button>
                <Button size="sm" variant="danger" onClick={() => setConfirmZonaDelete(zona)}>Eliminar</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!zonaModal}
        onClose={() => setZonaModal(null)}
        title={zonaModal === 'new' ? `Nueva zona — ${bodega.nombre}` : 'Editar zona'}
        size="sm"
      >
        <ZonaForm
          bodegaId={bodega.id}
          initial={zonaModal !== 'new' ? zonaModal : undefined}
          onSuccess={() => setZonaModal(null)}
          onCancel={() => setZonaModal(null)}
        />
      </Modal>

      <Modal
        open={!!confirmZonaDelete}
        onClose={() => setConfirmZonaDelete(null)}
        title="Confirmar eliminación"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmZonaDelete(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => handleDeleteZona(confirmZonaDelete)} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-wine-900">
          ¿Eliminar la zona <strong>{confirmZonaDelete?.nombre}</strong>?
        </p>
      </Modal>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function BodegasPage() {
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedBodega, setExpandedBodega] = useState(null);

  const { data: bodegas = [], isLoading } = useBodegas();
  const deleteMut = useDeleteBodega();

  async function handleDelete(id) {
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Bodega eliminada');
      setConfirmDelete(null);
    } catch (err) {
      toast.error(formatApiError(err, 'No se pudo eliminar la bodega'));
    }
  }

  function toggleZonas(bodegaId) {
    setExpandedBodega((prev) => (prev === bodegaId ? null : bodegaId));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModal('new')}>+ Nueva Bodega</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
      ) : bodegas.length === 0 ? (
        <EmptyState title="Sin bodegas" description="Crea la primera bodega." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-peach-200 bg-white">
          {bodegas.map((bodega, i) => (
            <div key={bodega.id}>
              {/* Fila de bodega */}
              <div className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-peach-200/60' : ''} hover:bg-cream-50`}>
                <span className="font-medium text-wine-900">{bodega.nombre}</span>
                <Badge tone={bodega.tipo === 'PRINCIPAL' ? 'info' : 'success'}>
                  {bodega.tipo === 'PRINCIPAL' ? 'Principal' : 'PDP'}
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => toggleZonas(bodega.id)}>
                  {expandedBodega === bodega.id ? 'Ocultar zonas' : `Zonas (${bodega.zonas?.length ?? 0})`}
                </Button>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setModal(bodega)}>Editar</Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirmDelete(bodega)}>Eliminar</Button>
                </div>
              </div>
              {/* Panel de zonas expandible */}
              {expandedBodega === bodega.id && <ZonasPanel bodega={bodega} />}
            </div>
          ))}
        </div>
      )}

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
