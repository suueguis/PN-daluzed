// src/api/alertasAPI.js
import axiosClient from './axiosClient';

export const alertasAPI = {
  activas:      ()             => axiosClient.get('/alertas/activas/').then((r) => r.data),
  reorden:      ()             => axiosClient.get('/alertas/reorden/').then((r) => r.data),
  vencimiento:  (dias = 7)     => axiosClient.get('/alertas/vencimiento/', { params: { dias } }).then((r) => r.data),
  produccion:   ()             => axiosClient.get('/alertas/produccion-vencida/').then((r) => r.data),
  resolver:     (id, mensaje = '') =>
    axiosClient.post(`/alertas/${id}/resolver/`, { mensaje }).then((r) => r.data),
};

export default alertasAPI;
