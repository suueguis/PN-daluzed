const FIELD_LABELS = {
  orden_compra_id:          'Orden de compra',
  orden_compra:             'Orden de compra',
  justificacion_vencimiento:'Justificación de vencimiento',
  detalles:                 'Detalle de recepción',
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
  notas:                    'Notas',
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

function extractFirstMessage(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const msg = extractFirstMessage(item);
      if (msg) return msg;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const msg = extractFirstMessage(value[key]);
      if (msg) return msg;
    }
    return null;
  }
  if (value != null) return String(value);
  return null;
}

export function formatApiError(error, fallback = 'Algo salió mal') {
  const httpStatus = error?.response?.status;
  const data = error?.response?.data;

  if (!error?.response) {
    return `${fallback} (sin conexión con el servidor)`;
  }

  if (httpStatus === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
  if (httpStatus === 403) return 'No tienes permisos para realizar esta acción.';
  if (httpStatus === 404) return 'El recurso no fue encontrado.';
  if (httpStatus >= 500) return 'Error interno del servidor. Intenta de nuevo en unos momentos.';

  if (typeof data === 'string') return data;
  if (data?.detail) return String(data.detail);

  if (data && typeof data === 'object') {
    const firstField = Object.keys(data)[0];
    if (firstField) {
      const msg = extractFirstMessage(data[firstField]);
      if (msg) return `${labelFor(firstField)}: ${msg}`;
    }
  }

  return fallback;
}
