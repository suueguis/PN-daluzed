import axiosClient from './axiosClient';

export const produccionAPI = {
  listBatidos: (params) => axiosClient.get('/produccion/batidos/', { params }),
  createBatido: (data) => axiosClient.post('/produccion/batidos/', data),

  sugerenciaFEFO: (productoTerminadoId) =>
    axiosClient.get('/produccion/sugerencia-fefo/', {
      params: { producto_terminado_id: productoTerminadoId },
    }),

  sugerenciaFIFO: (productoTerminadoId) =>
    axiosClient.get('/produccion/sugerencia-fifo/', {
      params: { producto_terminado_id: productoTerminadoId },
    }),

  listDespachos: () => axiosClient.get('/produccion/despachos/'),
  despacharLote: (id) => axiosClient.post(`/produccion/despachos/${id}/despachar/`),

  getJornada: (fecha) => axiosClient.get('/produccion/jornadas/', { params: { fecha } }),

  listCompensatorios: () => axiosClient.get('/produccion/compensatorios/'),
  createCompensatorio: (data) => axiosClient.post('/produccion/compensatorios/', data),

  listLotesPorMP: (mpId) =>
    axiosClient.get('/inventario/lotes/', { params: { materia_prima: mpId } }),
};
