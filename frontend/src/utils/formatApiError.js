const FIELD_LABELS = {
  orden_compra_id:          'Orden de compra',
  orden_compra:             'Orden de compra',
  justificacion_vencimiento:'Justificación de vencimiento',
  detalles:                 'Detalles de recepción',
  materia_prima_id:         'Materia prima',
  materia_prima:            'Materia prima',
  presentacion_id:          'Presentación',
  presentacion:             'Presentación',
  cantidad_presentacion:    'Cantidad',
  fecha_vencimiento:        'Fecha de vencimiento',
  numero_lote:              'Número de lote',
  lote_id:                  'Lote',
  bodega_destino:           'Bodega destino',
  cantidad:                 'Cantidad',
  motivo:                   'Motivo',
  proveedor_id:             'Proveedor',
  proveedor:                'Proveedor',
  non_field_errors:         'El formulario',
  username:                 'Usuario',
  email:                    'Correo electrónico',
  role:                     'Rol',
};

function labelFor(field) {
  return FIELD_LABELS[field] ?? field.replaceAll('_', ' ');
}

export function formatApiError(error, fallback = 'Algo salió mal') {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (!error?.response) {
    return `${fallback} (sin conexión con el servidor)`;
  }

  if (status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
  if (status === 403) return 'No tienes permisos para realizar esta acción.';
  if (status === 404) return 'El recurso no fue encontrado.';
  if (status >= 500) return `Error interno del servidor. Intenta de nuevo en unos momentos.`;

  if (typeof data === 'string') return data;
  if (data?.detail) return String(data.detail);

  if (data && typeof data === 'object') {
    const firstField = Object.keys(data)[0];
    if (firstField) {
      const value = data[firstField];
      const firstMsg = Array.isArray(value) ? value[0] : value;
      return `${labelFor(firstField)}: ${String(firstMsg)}`;
    }
  }

  return fallback;
}
