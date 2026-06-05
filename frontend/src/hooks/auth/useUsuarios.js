import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usuariosAPI } from '../../api/usuariosAPI';

export function useUsuariosQuery() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosAPI.list,
  });
}

export function useCreateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usuariosAPI.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function usePatchUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => usuariosAPI.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useDesactivarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => usuariosAPI.desactivar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}
