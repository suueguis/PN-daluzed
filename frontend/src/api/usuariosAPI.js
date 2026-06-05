import axiosClient from './axiosClient';

const BASE = '/auth/usuarios';

export const usuariosAPI = {
  list: () => axiosClient.get(`${BASE}/`).then((r) => r.data),
  create: (data) => axiosClient.post(`${BASE}/`, data).then((r) => r.data),
  update: (id, data) => axiosClient.patch(`${BASE}/${id}/`, data).then((r) => r.data),
  desactivar: (id) => axiosClient.post(`${BASE}/${id}/desactivar/`).then((r) => r.data),
};
