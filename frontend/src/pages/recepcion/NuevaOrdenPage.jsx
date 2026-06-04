import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ordenesAPI, catalogoForRecepcion } from '../../api/recepcionAPI';
import { formatApiError } from '../../utils/formatApiError';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

export default function NuevaOrdenPage() {
  const navigate = useNavigate();

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      proveedor_id: '',
      detalles: [{ materia_prima_id: '', presentacion_id: '', cantidad_presentacion: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'detalles' });

  const { data: provData } = useQuery({
    queryKey: ['catalogo', 'proveedores'],
    queryFn: () => catalogoForRecepcion.proveedores().then((r) => r.data),
  });
  const proveedores = provData?.results ?? provData ?? [];

  const { data: mpsData } = useQuery({
    queryKey: ['catalogo', 'materias-primas'],
    queryFn: () => catalogoForRecepcion.materiasPrimas().then((r) => r.data),
  });
  const mps = mpsData?.results ?? mpsData ?? [];

  const { data: presData } = useQuery({
    queryKey: ['catalogo', 'presentaciones'],
    queryFn: () => catalogoForRecepcion.presentaciones().then((r) => r.data),
  });
  const presentaciones = presData?.results ?? presData ?? [];

  const provOptions = proveedores.map((p) => ({ value: String(p.id), label: p.nombre }));
  const mpOptions   = mps.map((m) => ({ value: String(m.id), label: m.nombre }));
  const presOptions = presentaciones.map((p) => ({ value: String(p.id), label: p.nombre ?? `#${p.id}` }));

  const onSubmit = async (formData) => {
    try {
      await ordenesAPI.create({
        proveedor_id: Number(formData.proveedor_id),
        detalles: formData.detalles.map((d) => ({
          materia_prima_id:     Number(d.materia_prima_id),
          presentacion_id:      Number(d.presentacion_id),
          cantidad_presentacion: d.cantidad_presentacion,
        })),
      });
      toast.success('Orden de compra creada.');
      navigate('/recepcion/ordenes');
    } catch (err) {
      toast.error(formatApiError(err, 'No se pudo crear la orden de compra'));
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Volver</Button>
        <h2 className="font-crushed text-2xl text-wine-900">Nueva Orden de Compra</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-2xl border border-peach-200 bg-white p-5">
          <Controller
            control={control}
            name="proveedor_id"
            rules={{ required: 'Selecciona un proveedor' }}
            render={({ field }) => (
              <Select
                label="Proveedor"
                options={provOptions}
                placeholder="— Seleccionar proveedor —"
                error={errors.proveedor_id?.message}
                {...field}
              />
            )}
          />
        </div>

        <div className="rounded-2xl border border-peach-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-wine-900">Líneas de pedido</h3>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => append({ materia_prima_id: '', presentacion_id: '', cantidad_presentacion: '' })}
            >
              + Agregar línea
            </Button>
          </div>

          {fields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-peach-200/60 pt-4 first:border-0 first:pt-0">
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
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Cantidad"
                    type="number"
                    step="0.01"
                    min="0.01"
                    error={errors.detalles?.[idx]?.cantidad_presentacion?.message}
                    {...register(`detalles.${idx}.cantidad_presentacion`, {
                      required: 'Requerido',
                      min: { value: 0.01, message: '> 0' },
                    })}
                  />
                </div>
                {fields.length > 1 && (
                  <Button type="button" size="sm" variant="danger" onClick={() => remove(idx)} className="mb-0.5">
                    ✕
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear OC'}
          </Button>
        </div>
      </form>
    </div>
  );
}
