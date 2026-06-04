import axiosClient from './axiosClient';

export const zonasAPI = {
  list:   (bodegaId) => axiosClient.get('/inventario/zonas/', { params: bodegaId ? { bodega: bodegaId } : {} }),
  create: (data)     => axiosClient.post('/inventario/zonas/', data),
  update: (id, data) => axiosClient.patch(`/inventario/zonas/${id}/`, data),
  remove: (id)       => axiosClient.delete(`/inventario/zonas/${id}/`),
};
