import axiosClient from './axiosClient';

export const bodegasAPI = {
  list: ()           => axiosClient.get('/inventario/bodegas/'),
  create: (data)     => axiosClient.post('/inventario/bodegas/', data),
  update: (id, data) => axiosClient.patch(`/inventario/bodegas/${id}/`, data),
  remove: (id)       => axiosClient.delete(`/inventario/bodegas/${id}/`),
};

export const lotesAPI = {
  list: (params) => axiosClient.get('/inventario/lotes/', { params }),
};

export const stockAPI = {
  get: (params) => axiosClient.get('/inventario/stock/', { params }),
};

export const reordenAPI = {
  get: (materia_prima) => axiosClient.get('/inventario/reorden/', { params: { materia_prima } }),
};

export const fefoAPI = {
  get: (params) => axiosClient.get('/inventario/fefo/', { params }),
};

export const trasladosAPI = {
  list: ()     => axiosClient.get('/inventario/traslados/'),
  create: (data) => axiosClient.post('/inventario/traslados/', data),
};

export const devolucionesAPI = {
  create: (data) => axiosClient.post('/inventario/devoluciones/', data),
};

export const descartesAPI = {
  create: (data) => axiosClient.post('/inventario/descartes/', data),
};

export const trazabilidadAPI = {
  get: (loteId) => axiosClient.get(`/inventario/trazabilidad/${loteId}/`),
};

export const kardexAPI = {
  get: (params) => axiosClient.get('/inventario/kardex/', { params }).then((r) => r.data),
};
