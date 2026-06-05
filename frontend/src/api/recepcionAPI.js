import axiosClient from './axiosClient';

export const ordenesAPI = {
  list: (params) => axiosClient.get('/recepcion/ordenes/', { params }),
  get:  (id)     => axiosClient.get(`/recepcion/ordenes/${id}/`),
  create: (data) => axiosClient.post('/recepcion/ordenes/', data),
};

export const recepcionesAPI = {
  list:   (params) => axiosClient.get('/recepcion/', { params }),
  get:    (id)     => axiosClient.get(`/recepcion/${id}/`),
  create: (data)   => axiosClient.post('/recepcion/', data),
  pdf:    (id)     => axiosClient.get(`/recepcion/${id}/pdf/`, { responseType: 'blob' }),
};

export const catalogoForRecepcion = {
  proveedores:    (params) => axiosClient.get('/catalogo/proveedores/', { params }),
  materiasPrimas: (params) => axiosClient.get('/catalogo/materias-primas/', { params }),
  presentaciones: (params) => axiosClient.get('/catalogo/presentaciones/', { params }),
};
