import axiosClient from './axiosClient';

const BASE = '/catalogo';

function makeResource(path) {
  return {
    list: (params) => axiosClient.get(`${BASE}/${path}/`, { params }).then((r) => r.data),
    get: (id) => axiosClient.get(`${BASE}/${path}/${id}/`).then((r) => r.data),
    create: (data) => axiosClient.post(`${BASE}/${path}/`, data).then((r) => r.data),
    update: (id, data) => axiosClient.patch(`${BASE}/${path}/${id}/`, data).then((r) => r.data),
  };
}

export const unidadesAPI = makeResource('unidades-medida');
export const proveedoresAPI = makeResource('proveedores');
export const productosTerminadosAPI = makeResource('productos-terminados');

export const materiasPrimasAPI = {
  ...makeResource('materias-primas'),
  desactivar: (id) =>
    axiosClient.post(`${BASE}/materias-primas/${id}/desactivar/`).then((r) => r.data),
  agregarProveedor: (id, proveedorId) =>
    axiosClient
      .post(`${BASE}/materias-primas/${id}/proveedores/`, { proveedor_id: proveedorId })
      .then((r) => r.data),
};

export const TIPOS_IMPORT = ['materias_primas', 'productos_terminados', 'proveedores'];

export function descargarPlantilla(tipo) {
  return axiosClient.get(`${BASE}/plantilla/`, { params: { tipo }, responseType: 'blob' });
}

export function importarCatalogo(file, tipo) {
  const form = new FormData();
  form.append('file', file);
  form.append('tipo', tipo);
  return axiosClient
    .post(`${BASE}/importar/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
}
