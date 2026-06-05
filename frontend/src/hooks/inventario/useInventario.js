import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bodegasAPI, lotesAPI, fefoAPI, trasladosAPI, devolucionesAPI, descartesAPI, trazabilidadAPI, kardexAPI } from '../../api/inventarioAPI';

// ── Keys ─────────────────────────────────────────────────────────────────────

export const INV_KEYS = {
  bodegas:   ['inventario', 'bodegas'],
  lotes:     (params) => ['inventario', 'lotes', params],
  traslados: ['inventario', 'traslados'],
  fefo:      (params) => ['inventario', 'fefo', params],
};

// ── Bodegas ───────────────────────────────────────────────────────────────────

export function useBodegas() {
  return useQuery({
    queryKey: INV_KEYS.bodegas,
    queryFn: async () => {
      const { data } = await bodegasAPI.list();
      return data;
    },
  });
}

export function useCreateBodega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => bodegasAPI.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INV_KEYS.bodegas }),
  });
}

export function useUpdateBodega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => bodegasAPI.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INV_KEYS.bodegas }),
  });
}

export function useDeleteBodega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => bodegasAPI.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: INV_KEYS.bodegas }),
  });
}

// ── Lotes ─────────────────────────────────────────────────────────────────────

export function useTrazabilidad(loteId) {
  return useQuery({
    queryKey: ['inventario', 'trazabilidad', loteId],
    queryFn: async () => {
      const { data } = await trazabilidadAPI.get(loteId);
      return data;
    },
    enabled: !!loteId,
  });
}

export function useLotes(params = {}) {
  return useQuery({
    queryKey: INV_KEYS.lotes(params),
    queryFn: async () => {
      const { data } = await lotesAPI.list(params);
      return data;
    },
  });
}

// ── Traslados ─────────────────────────────────────────────────────────────────

export function useTraslados() {
  return useQuery({
    queryKey: INV_KEYS.traslados,
    queryFn: async () => {
      const { data } = await trasladosAPI.list();
      return data;
    },
  });
}

export function useCreateTraslado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => trasladosAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario', 'lotes'] });
      qc.invalidateQueries({ queryKey: INV_KEYS.traslados });
    },
  });
}

// ── FEFO ──────────────────────────────────────────────────────────────────────

export function useFefo(params, enabled = true) {
  return useQuery({
    queryKey: INV_KEYS.fefo(params),
    queryFn: async () => {
      const { data } = await fefoAPI.get(params);
      return data;
    },
    enabled: enabled && !!params?.materia_prima,
  });
}

// ── Devolución ────────────────────────────────────────────────────────────────

export function useCreateDevolucion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => devolucionesAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario', 'lotes'] });
    },
  });
}

// ── Descarte ──────────────────────────────────────────────────────────────────

export function useCreateDescarte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => descartesAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario', 'lotes'] });
    },
  });
}

export function useKardex(params) {
  return useQuery({
    queryKey: ["inventario", "kardex", params],
    queryFn: () => kardexAPI.get(params),
    enabled: !!params?.materia_prima,
  });
}
