export const CATEGORIAS = [
  { value: 'GALLETERIA', label: 'Galletería' },
  { value: 'TORTA', label: 'Torta' },
  { value: 'BIZCOCHO', label: 'Bizcocho' },
  { value: 'GENERAL', label: 'General' },
];

export const CONDICIONES = [
  { value: 'AMBIENTE', label: 'Temperatura ambiente' },
  { value: 'REFRIGERACION', label: 'Refrigeración' },
  { value: 'CONGELADO', label: 'Congelado' },
];

export function emptyMpForm() {
  return {
    nombre: '',
    unidad_medida: '',
    punto_reorden: '0',
    dias_minimos_vencimiento: '',
    categoria: 'GENERAL',
    condicion_almacenamiento: 'AMBIENTE',
    activo: true,
  };
}

export function mpRowToForm(row) {
  if (!row) return emptyMpForm();
  return {
    nombre: row.nombre || '',
    unidad_medida: row.unidad_medida ?? '',
    punto_reorden: row.punto_reorden != null ? String(row.punto_reorden) : '0',
    dias_minimos_vencimiento:
      row.dias_minimos_vencimiento != null ? String(row.dias_minimos_vencimiento) : '',
    categoria: row.categoria || 'GENERAL',
    condicion_almacenamiento: row.condicion_almacenamiento || 'AMBIENTE',
    activo: row.activo,
  };
}

export function mpFormToPayload(form) {
  const punto = Number(form.punto_reorden);
  return {
    nombre: form.nombre.trim(),
    unidad_medida: Number(form.unidad_medida) || null,
    punto_reorden: Number.isFinite(punto) && punto >= 0 ? punto : 0,
    dias_minimos_vencimiento:
      form.dias_minimos_vencimiento === '' ? null : Number(form.dias_minimos_vencimiento),
    categoria: form.categoria,
    condicion_almacenamiento: form.condicion_almacenamiento,
    activo: form.activo,
  };
}

export function validateMpForm(form) {
  if (!form.nombre.trim()) return 'El nombre es obligatorio';
  if (!form.unidad_medida) return 'Selecciona una unidad de medida';
  if (Number(form.punto_reorden) < 0) return 'El punto de reorden debe ser ≥ 0';
  if (form.dias_minimos_vencimiento !== '' && Number(form.dias_minimos_vencimiento) < 0)
    return 'Los días no pueden ser negativos';
  return null;
}
