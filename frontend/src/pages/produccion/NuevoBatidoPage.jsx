import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { useApiQuery, useApiMutation } from '../../hooks/useApi';
import { produccionAPI } from '../../api/produccionAPI';

const schema = z.object({
  producto_terminado_id: z.coerce.number().positive('Selecciona un producto'),
  fecha_produccion: z.string().min(1, 'Requerida'),
  hora_inicio: z.string().min(1, 'Requerida'),
  ingredientes: z
    .array(
      z.object({
        materia_prima_id: z.coerce.number().positive('Selecciona MP'),
        lote_id: z.coerce.number().positive('Selecciona lote'),
        cantidad: z.coerce.number().positive('Debe ser > 0'),
      }),
    )
    .min(1, 'Agrega al menos un ingrediente'),
});

export default function NuevoBatidoPage() {
  const navigate = useNavigate();
  const [sugeriendo, setSugeriendo] = useState(false);
  const [lotesPerRow, setLotesPerRow] = useState({});

  const { data: productosData } = useApiQuery(
    ['productos-terminados'],
    '/catalogo/productos-terminados/',
  );
  const { data: mpData } = useApiQuery(['materias-primas'], '/catalogo/materias-primas/');

  const ptOptions = (
    Array.isArray(productosData) ? productosData : (productosData?.results ?? [])
  ).map((p) => ({ value: p.id, label: p.nombre }));

  const mpOptions = (Array.isArray(mpData) ? mpData : (mpData?.results ?? [])).map((m) => ({
    value: m.id,
    label: m.nombre,
  }));

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha_produccion: format(new Date(), 'yyyy-MM-dd'),
      hora_inicio: '',
      ingredientes: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'ingredientes',
  });

  const productoId = useWatch({ control, name: 'producto_terminado_id' });

  const crearMutation = useApiMutation({
    url: '/produccion/batidos/',
    onSuccess: () => {
      toast.success('Batido registrado correctamente');
      navigate('/produccion/batidos');
    },
    onError: (err) => {
      const detail = err?.response?.data?.detail ?? 'Error al registrar el batido';
      if (detail.includes('faltante')) {
        toast.error(detail);
      } else {
        toast.error('Hay 2 batidos en proceso, espera a completarlos.');
      }
    },
  });

  const handleSugerirFEFO = async () => {
    if (!productoId) {
      toast.error('Selecciona un producto primero');
      return;
    }
    setSugeriendo(true);
    try {
      const { data } = await produccionAPI.sugerenciaFEFO(productoId);
      const sugerencias = data?.sugerencias ?? [];
      if (!sugerencias.length) {
        toast.info('Sin sugerencias FEFO disponibles para este producto');
        return;
      }
      replace(
        sugerencias.map((s) => ({
          materia_prima_id: s.materia_prima_id,
          lote_id: s.lote_id,
          cantidad: '',
          _nombre: s.materia_prima_nombre,
          _vencimiento: s.fecha_vencimiento,
          _disponible: String(s.cantidad_disponible),
        })),
      );
    } catch {
      toast.error('Error al obtener sugerencias FEFO');
    } finally {
      setSugeriendo(false);
    }
  };

  const handleMPChange = async (index, mpId) => {
    setValue(`ingredientes.${index}.lote_id`, '');
    if (!mpId) return;
    try {
      const { data } = await produccionAPI.listLotesPorMP(mpId);
      setLotesPerRow((prev) => ({
        ...prev,
        [index]: Array.isArray(data) ? data : (data?.results ?? []),
      }));
    } catch {
      setLotesPerRow((prev) => ({ ...prev, [index]: [] }));
    }
  };

  const onSubmit = (values) => crearMutation.mutate(values);

  return (
    <div className="space-y-6">
      <h2 className="font-crushed text-2xl text-wine-900">Registrar batido</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header fields */}
        <div className="rounded-2xl border border-peach-200 bg-white p-5 space-y-4">
          <h3 className="font-semibold text-wine-900">Datos generales</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              label="Producto terminado"
              placeholder="Selecciona producto…"
              options={ptOptions}
              error={errors.producto_terminado_id?.message}
              {...register('producto_terminado_id')}
            />
            <Input
              label="Fecha producción"
              type="date"
              error={errors.fecha_produccion?.message}
              {...register('fecha_produccion')}
            />
            <Input
              label="Hora inicio"
              type="time"
              error={errors.hora_inicio?.message}
              {...register('hora_inicio')}
            />
          </div>
        </div>

        {/* Ingredients */}
        <div className="rounded-2xl border border-peach-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-wine-900">Ingredientes</h3>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSugerirFEFO}
                disabled={!productoId || sugeriendo}
              >
                {sugeriendo ? <Spinner size="sm" /> : <Sparkles size={14} />}
                Sugerir FEFO
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  append({ materia_prima_id: '', lote_id: '', cantidad: '' })
                }
              >
                <Plus size={14} /> Agregar
              </Button>
            </div>
          </div>

          {errors.ingredientes?.root && (
            <p className="text-xs text-cherry-500">{errors.ingredientes.root.message}</p>
          )}
          {errors.ingredientes?.message && (
            <p className="text-xs text-cherry-500">{errors.ingredientes.message}</p>
          )}

          {fields.length === 0 ? (
            <p className="py-6 text-center text-sm text-wine-700/60">
              Usa "Sugerir FEFO" o agrega ingredientes manualmente.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-peach-200">
              <table className="w-full text-sm">
                <thead className="bg-cream-100">
                  <tr>
                    {['Materia prima', 'Lote', 'Disponible', 'Cantidad', ''].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-wine-700"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => (
                    <tr key={field.id} className="border-t border-peach-200/60">
                      {/* MP column */}
                      <td className="px-3 py-2">
                        {field._nombre ? (
                          <>
                            <input
                              type="hidden"
                              {...register(`ingredientes.${idx}.materia_prima_id`)}
                            />
                            <span className="font-medium text-wine-900">{field._nombre}</span>
                          </>
                        ) : (
                          <select
                            className="rounded-xl border border-peach-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                            {...register(`ingredientes.${idx}.materia_prima_id`)}
                            onChange={(e) => {
                              register(`ingredientes.${idx}.materia_prima_id`).onChange(e);
                              handleMPChange(idx, e.target.value);
                            }}
                          >
                            <option value="" disabled>Selecciona materia prima…</option>
                            {mpOptions.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        )}
                        {errors.ingredientes?.[idx]?.materia_prima_id && (
                          <p className="text-xs text-cherry-500">
                            {errors.ingredientes[idx].materia_prima_id.message}
                          </p>
                        )}
                      </td>

                      {/* Lote column */}
                      <td className="px-3 py-2">
                        {field._nombre ? (
                          <>
                            <input
                              type="hidden"
                              {...register(`ingredientes.${idx}.lote_id`)}
                            />
                            <span className="text-wine-700">
                              #{field.lote_id}
                              {field._vencimiento && (
                                <span className="ml-1 text-xs text-wine-700/60">
                                  vence {field._vencimiento}
                                </span>
                              )}
                            </span>
                          </>
                        ) : (
                          <select
                            className="rounded-xl border border-peach-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                            {...register(`ingredientes.${idx}.lote_id`)}
                          >
                            <option value="" disabled>Selecciona lote…</option>
                            {(lotesPerRow[idx] ?? []).map((l) => (
                              <option key={l.id} value={l.id}>
                                #{l.id} · {l.fecha_vencimiento} · {l.cantidad} disp.
                              </option>
                            ))}
                          </select>
                        )}
                        {errors.ingredientes?.[idx]?.lote_id && (
                          <p className="text-xs text-cherry-500">
                            {errors.ingredientes[idx].lote_id.message}
                          </p>
                        )}
                      </td>

                      {/* Disponible */}
                      <td className="px-3 py-2 text-wine-700">{field._disponible ?? '—'}</td>

                      {/* Cantidad */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="ej. 250.00"
                          className="w-28 rounded-xl border border-peach-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                          {...register(`ingredientes.${idx}.cantidad`)}
                        />
                        {errors.ingredientes?.[idx]?.cantidad && (
                          <p className="text-xs text-cherry-500">
                            {errors.ingredientes[idx].cantidad.message}
                          </p>
                        )}
                      </td>

                      {/* Delete */}
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="rounded-lg p-1.5 text-cherry-500 hover:bg-cherry-500/10"
                          aria-label="Eliminar ingrediente"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/produccion/batidos')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={crearMutation.isPending}>
            {crearMutation.isPending && <Spinner size="sm" />}
            Registrar batido
          </Button>
        </div>
      </form>
    </div>
  );
}
