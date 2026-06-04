export function formatApiError(error, fallback = 'Algo salió mal') {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (!error?.response) {
    return `${fallback} (sin conexión con el servidor)`;
  }

  if (status === 401) return 'Sesión expirada o credenciales inválidas.';
  if (status === 403) return 'No tienes permisos para esta acción.';
  if (status === 404) return 'No encontrado.';
  if (status >= 500) return `${fallback} (error del servidor ${status}).`;

  if (typeof data === 'string') return data;
  if (data?.detail) return String(data.detail);

  if (data && typeof data === 'object') {
    const firstField = Object.keys(data)[0];
    if (firstField) {
      const value = data[firstField];
      const firstMsg = Array.isArray(value) ? value[0] : value;
      return `${firstField}: ${String(firstMsg)}`;
    }
  }

  return fallback;
}
