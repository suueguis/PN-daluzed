import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  unidadesAPI,
  proveedoresAPI,
  materiasPrimasAPI,
  productosTerminadosAPI,
  importarCatalogo,
} from '../../api/catalogoAPI';

// ─── helpers ────────────────────────────────────────────────────────────────
function useListQuery(key, api, params, options) {
  return useQuery({
    queryKey: [key, params],
    queryFn: () => api.list(params).then((d) => d?.results ?? d),
    ...options,
  });
}

function useCreate(key, api) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
}

function useUpdate(key, api) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
}

// ─── unidades ──────────────────────────────────────────────────────────────
export const useUnidadesQuery = (params) => useListQuery('unidades', unidadesAPI, params);
export const useCreateUnidad = () => useCreate('unidades', unidadesAPI);
export const useUpdateUnidad = () => useUpdate('unidades', unidadesAPI);

// ─── proveedores ───────────────────────────────────────────────────────────
export const useProveedoresQuery = (params) => useListQuery('proveedores', proveedoresAPI, params);
export const useCreateProveedor = () => useCreate('proveedores', proveedoresAPI);
export const useUpdateProveedor = () => useUpdate('proveedores', proveedoresAPI);

// ─── materias primas ───────────────────────────────────────────────────────
export const useMateriasPrimasQuery = (params) =>
  useListQuery('mp', materiasPrimasAPI, params);
export const useCreateMP = () => useCreate('mp', materiasPrimasAPI);
export const useUpdateMP = () => useUpdate('mp', materiasPrimasAPI);

export function useDesactivarMP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => materiasPrimasAPI.desactivar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mp'] }),
  });
}

// ─── productos terminados ──────────────────────────────────────────────────
export const useProductosQuery = (params) => useListQuery('productos', productosTerminadosAPI, params);
export const useCreateProducto = () => useCreate('productos', productosTerminadosAPI);
export const useUpdateProducto = () => useUpdate('productos', productosTerminadosAPI);

// ─── importación ───────────────────────────────────────────────────────────
export function useImportarCatalogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, tipo }) => importarCatalogo(file, tipo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mp'] });
      qc.invalidateQueries({ queryKey: ['proveedores'] });
      qc.invalidateQueries({ queryKey: ['productos'] });
    },
  });
}
