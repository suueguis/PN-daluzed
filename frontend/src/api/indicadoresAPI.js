import axiosClient from './axiosClient';

export const kpisAPI = {
  stock:        ()                  => axiosClient.get('/indicadores/kpis/', { params: { tipo: 'stock' } }),
  vencimientos: (dias = 7)          => axiosClient.get('/indicadores/kpis/', { params: { tipo: 'vencimientos', dias } }),
  produccion:   (desde, hasta)      => axiosClient.get('/indicadores/kpis/', { params: { tipo: 'produccion', desde, hasta } }),
};

export const exportarAPI = {
  descargar: (formato, desde, hasta) => {
    const params = { formato };
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    return axiosClient.get('/indicadores/exportar/', { params, responseType: 'blob' });
  },
};

export const indicadoresAPI = {
  utilizacionBodega: () => axiosClient.get('/indicadores/utilizacion-bodega/').then((r) => r.data),
  resumen: () => axiosClient.get('/indicadores/resumen/').then((r) => r.data),
};

export const reporteSemanalAPI = {
  get: (params) => axiosClient.get('/indicadores/reporte-semanal/', { params }).then((r) => r.data),
  descargarExcel: (desde, hasta) =>
    axiosClient.get('/indicadores/reporte-semanal/', {
      params: { desde, hasta, formato: 'xlsx' },
      responseType: 'blob',
    }),
};
