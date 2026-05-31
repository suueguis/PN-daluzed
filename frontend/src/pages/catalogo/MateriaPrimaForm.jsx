import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { CATEGORIAS, CONDICIONES } from './mpForm';

export default function MateriaPrimaForm({ value, onChange, unidades = [] }) {
  const set = (k, v) => onChange?.({ ...value, [k]: v });

  return (
    <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
      <div className="sm:col-span-2">
        <Input
          label="Nombre"
          name="nombre"
          value={value.nombre}
          onChange={(e) => set('nombre', e.target.value)}
        />
      </div>

      <Select
        label="Unidad de medida"
        name="unidad_medida"
        placeholder="Selecciona…"
        value={value.unidad_medida}
        onChange={(e) => set('unidad_medida', e.target.value)}
        options={unidades.map((u) => ({ value: u.id, label: `${u.nombre} (${u.simbolo})` }))}
      />

      <Input
        label="Punto de reorden"
        name="punto_reorden"
        type="number"
        min="0"
        step="0.01"
        value={value.punto_reorden}
        onChange={(e) => set('punto_reorden', e.target.value)}
      />

      <Input
        label="Días mínimos vencimiento"
        name="dias_minimos_vencimiento"
        type="number"
        min="0"
        value={value.dias_minimos_vencimiento}
        onChange={(e) => set('dias_minimos_vencimiento', e.target.value)}
        placeholder="Opcional"
      />

      <Select
        label="Categoría"
        name="categoria"
        value={value.categoria}
        onChange={(e) => set('categoria', e.target.value)}
        options={CATEGORIAS}
      />

      <Select
        label="Condición de almacenamiento"
        name="condicion_almacenamiento"
        value={value.condicion_almacenamiento}
        onChange={(e) => set('condicion_almacenamiento', e.target.value)}
        options={CONDICIONES}
      />

      <label className="flex items-center gap-2 text-sm text-wine-900 sm:col-span-2">
        <input
          type="checkbox"
          checked={value.activo}
          onChange={(e) => set('activo', e.target.checked)}
        />
        Activo
      </label>
    </form>
  );
}
