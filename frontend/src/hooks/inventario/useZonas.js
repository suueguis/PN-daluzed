import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zonasAPI } from '../../api/zonasAPI';

const key = (bodegaId) => ['inventario', 'zonas', bodegaId ?? 'all'];

export function useZonas(bodegaId) {
  return useQuery({
    queryKey: key(bodegaId),
    queryFn: async () => {
      const { data } = await zonasAPI.list(bodegaId);
      return data;
    },
    enabled: !!bodegaId,
  });
}

export function useCreateZona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => zonasAPI.create(data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: key(vars.bodega) }),
  });
}

export function useUpdateZona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => zonasAPI.update(id, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: key(vars.bodega) }),
  });
}

export function useDeleteZona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bodegaId }) => zonasAPI.remove(id),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: key(vars.bodegaId) }),
  });
}
