// src/hooks/alertas/useAlertas.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import alertasAPI from '../../api/alertasAPI';
import useAlertasStore from '../../store/alertasStore';
import { formatApiError } from '../../utils/formatApiError';

const STALE_30S = 30_000;

export function useAlertasActivas() {
  const setAlertas = useAlertasStore((s) => s.setAlertas);
  return useQuery({
    queryKey: ['alertas', 'activas'],
    queryFn: async () => {
      const data = await alertasAPI.activas();
      setAlertas(data);
      return data;
    },
    staleTime: STALE_30S,
  });
}

export function useAlertasReorden() {
  return useQuery({
    queryKey: ['alertas', 'reorden'],
    queryFn: alertasAPI.reorden,
    staleTime: STALE_30S,
  });
}

export function useAlertasVencimiento(dias = 7) {
  return useQuery({
    queryKey: ['alertas', 'vencimiento', dias],
    queryFn: () => alertasAPI.vencimiento(dias),
    staleTime: STALE_30S,
  });
}

export function useAlertasProduccion() {
  return useQuery({
    queryKey: ['alertas', 'produccion-vencida'],
    queryFn: alertasAPI.produccion,
    staleTime: STALE_30S,
  });
}

export function useResolverAlerta() {
  const queryClient = useQueryClient();
  const resolverLocal = useAlertasStore((s) => s.resolverLocal);
  return useMutation({
    mutationFn: ({ id, mensaje = '' }) => alertasAPI.resolver(id, mensaje),
    onSuccess: (_data, variables) => {
      resolverLocal(variables.id);
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast.success('Alerta resuelta');
    },
    onError: (err) => toast.error(formatApiError(err, 'No se pudo resolver la alerta')),
  });
}

export function useConfiguracionAlerta() {
  return useQuery({
    queryKey: ['alertas', 'configuracion'],
    queryFn: alertasAPI.obtenerConfiguracion,
    staleTime: 60_000,
  });
}

export function useActualizarConfiguracion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => alertasAPI.actualizarConfiguracion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas', 'configuracion'] });
      toast.success('Configuración actualizada');
    },
    onError: (err) => toast.error(formatApiError(err, 'No se pudo actualizar la configuración')),
  });
}
