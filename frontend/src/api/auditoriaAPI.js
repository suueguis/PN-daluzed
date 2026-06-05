import axiosClient from './axiosClient';

export const auditoriaAPI = {
  bitacora: (params) =>
    axiosClient.get('/auditoria/bitacora/', { params }).then((r) => r.data),
};
