import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { ordenesAPI, recepcionesAPI, catalogoForRecepcion } from '../../api/recepcionAPI';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';

function buildPayload(formData, justificacion = '') {
  return {
    orden_compra_id:          Number(formData.orden_compra_id),
    justificacion_vencimiento: justificacion,
    detalles: formData.detalles.map((d) => ({
      materia_prima_id:      Number(d.materia_prima_id),
      presentacion_id:       Number(d.presentacion_id),
      cantidad_presentacion: d.cantidad_presentacion,
      fecha_vencimiento:     d.fecha_vencimiento,
      numero_lote:           d.numero_lote || '',
    })),
  };
}

export default function NuevaRecepcionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialOC = searchParams.get('oc') ?? '';

  const [justifOpen,    setJustifOpen]    = useState(false);
  const [justificacion, setJustificacion] = useState('');
  const [pendingForm,   setPendingForm]   = useState(null);
  const [submitting,    setSubmitting]    = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      orden_compra_id: initialOC,
      detalles: [{
        materia_prima_id:      '',
        presentacion_id:       '',
        cantidad_presentacion: '',
        fecha_vencimiento:     '',
        numero_lote:           '',
      }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'detalles' });

  const { data: ordenesData } = useQuery({
    queryKey: ['recepcion', 'ordenes', 'PENDIENTE'],
    queryFn:  () => ordenesAPI.list({ estado: 'PENDIENTE' }).then((r) => r.data),
  });
  const ordenes = ordenesData?.results ?? ordenesData ?? [];

  const { data: mpsData } = useQuery({
    queryKey: ['catalogo', 'materias-primas'],
    queryFn:  () => catalogoForRecepcion.materiasPrimas().then((r) => r.data),
  });
  const mps   = mpsData?.results ?? mpsData ?? [];
  const mpMap = Object.fromEntries(mps.map((m) => [String(m.id), m]));

  const { data: presData } = useQuery({
    queryKey: ['catalogo', 'presentaciones'],
    queryFn:  () => catalogoForRecepcion.presentaciones().then((r) => r.data),
  });
  const presentaciones = presData?.results ?? presData ?? [];

  const ocOptions  = ordenes.map((o) => ({ value: String(o.id), label: `OC-${o.id} — Prov. ${o.proveedor}` }));
  const mpOptions  = mps.map((m) => ({ value: String(m.id), label: m.nombre }));
  const presOptions = presentaciones.map((p) => ({ value: String(p.id), label: p.nombre ?? `#${p.id}` }));

  const doSubmit = async (formData, justif) => {
    setSubmitting(true);
    try {
      await recepcionesAPI.create(buildPayload(formData, justif));
      toast.success('Recepción registrada correctamente.');
      navigate('/recepcion/recepciones');
    } catch (err) {
      const detail = err?.response?.data?.detail ?? '';
      if (err?.response?.status === 400 && detail.includes('justificacion_vencimiento')) {
        setPendingForm(formData);
        setJustifOpen(true);
      } else {
        toast.error(detail || 'Error al registrar la recepción.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (formData) => {
    // Local advisory validation — warns but still submits (backend is authoritative)
    const hoy = new Date();
    for (const d of formData.detalles) {
      const mp = mpMap[d.materia_prima_id];
      if (mp?.dias_minimos_vencimiento && d.fecha_vencimiento) {
        const dias = differenceInDays(new Date(d.fecha_vencimiento), hoy);
        if (dias < mp.dias_minimos_vencimiento) {
          toast.warning(
            `"${mp.nombre}": ${dias} días restantes, mínimo requerido ${mp.dias_minimos_vencimiento}.`,
          );
        }
      }
    }
    doSubmit(formData, '');
  };

  const confirmJustif = () => {
    if (!justificacion.trim()) return;
    setJustifOpen(false);
    doSubmit(pendingForm, justificacion);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Volver</Button>
        <h2 className="font-crushed text-2xl text-wine-900">Nueva Recepción</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* OC selection */}
        <div className="rounded-2xl border border-peach-200 bg-white p-5">
          <h3 className="mb-4 font-semibold text-wine-900">Orden de compra</h3>
          <Controller
            control={control}
            name="orden_compra_id"
            rules={{ required: 'Selecciona una orden de compra' }}
            render={({ field }) => (
              <Select
                label="OC pendiente"
                options={ocOptions}
                placeholder="— Seleccionar OC —"
                error={errors.orden_compra_id?.message}
                {...field}
              />
            )}
          />
        </div>

        {/* Detalle lines */}
        <div className="rounded-2xl border border-peach-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-wine-900">Detalles de recepción</h3>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => append({
                materia_prima_id: '', presentacion_id: '',
                cantidad_presentacion: '', fecha_vencimiento: '', numero_lote: '',
              })}
            >
              + Agregar línea
            </Button>
          </div>

          {fields.map((field, idx) => (
            <div
              key={field.id}
              className="grid grid-cols-2 gap-3 border-t border-peach-200/60 pt-4 first:border-0 first:pt-0"
            >
              <Controller
                control={control}
                name={`detalles.${idx}.materia_prima_id`}
                rules={{ required: 'Requerido' }}
                render={({ field: f }) => (
                  <Select
                    label="Materia prima"
                    options={mpOptions}
                    placeholder="— MP —"
                    error={errors.detalles?.[idx]?.materia_prima_id?.message}
                    {...f}
                  />
                )}
              />
              <Controller
                control={control}
                name={`detalles.${idx}.presentacion_id`}
                rules={{ required: 'Requerido' }}
                render={({ field: f }) => (
                  <Select
                    label="Presentación"
                    options={presOptions}
                    placeholder="— Presentación —"
                    error={errors.detalles?.[idx]?.presentacion_id?.message}
                    {...f}
                  />
                )}
              />
              <Input
                label="Cantidad (en presentación)"
                type="number"
                step="0.01"
                min="0.01"
                error={errors.detalles?.[idx]?.cantidad_presentacion?.message}
                {...register(`detalles.${idx}.cantidad_presentacion`, {
                  required: 'Requerido',
                  min: { value: 0.01, message: 'Debe ser > 0' },
                })}
              />
              <Input
                label="Fecha de vencimiento"
                type="date"
                error={errors.detalles?.[idx]?.fecha_vencimiento?.message}
                {...register(`detalles.${idx}.fecha_vencimiento`, { required: 'Requerido' })}
              />
              <div className="col-span-2 flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Número de lote (opcional)"
                    {...register(`detalles.${idx}.numero_lote`)}
                  />
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => remove(idx)}
                    className="mb-0.5"
                  >
                    Quitar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Registrando…' : 'Registrar recepción'}
          </Button>
        </div>
      </form>

      {/* Justification modal — shown when backend rejects due to short expiry */}
      <Modal
        open={justifOpen}
        onClose={() => setJustifOpen(false)}
        title="Vida útil insuficiente — Justificación requerida"
        footer={
          <>
            <Button variant="secondary" onClick={() => setJustifOpen(false)}>Cancelar</Button>
            <Button onClick={confirmJustif} disabled={!justificacion.trim() || submitting}>
              {submitting ? 'Enviando…' : 'Confirmar con justificación'}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-wine-700">
          Uno o más lotes tienen vida útil inferior al mínimo requerido. Para continuar,
          proporciona una justificación (quedará registrada en la recepción).
        </p>
        <textarea
          className="w-full rounded-xl border border-peach-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          rows={4}
          placeholder="Ej: El proveedor certificó calidad extendida bajo condición X..."
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          aria-label="Justificación de vencimiento"
        />
      </Modal>
    </div>
  );
}
