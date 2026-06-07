// src/store/alertasStore.js
import { create } from 'zustand';
import { toast } from 'sonner';

const TIPO_LABEL = {
  STOCK_BAJO:          'Stock bajo',
  VENCIMIENTO_PROXIMO: 'Vencimiento próximo',
  EN_ESPERA_PENDIENTE: 'Lote PT pendiente',
};

function buildWsUrl() {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const host = apiUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${host}/ws/alertas/`;
  }
  // Dev fallback: backend on localhost:8000, frontend on Vite proxy
  const protocol = globalThis.location?.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://localhost:8000/ws/alertas/`;
}

const useAlertasStore = create((set, get) => ({
  alertas: [],
  ws: null,
  isConnected: false,

  // ── WebSocket ───────────────────────────────────────────────
  connect: () => {
    if (get().ws) return; // ya conectado
    const url = buildWsUrl();
    const ws = new WebSocket(url);

    ws.onopen = () => set({ isConnected: true });

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        get().pushAlerta(data);
        const label = TIPO_LABEL[data.tipo] ?? data.tipo;
        toast(`Nueva alerta: ${label}`, { description: data.mensaje });
      } catch {
        /* mensaje no-JSON: ignorar */
      }
    };

    ws.onclose = () => set({ isConnected: false, ws: null });
    ws.onerror = () => set({ isConnected: false });

    set({ ws });
  },

  disconnect: () => {
    const ws = get().ws;
    if (ws) {
      try { ws.close(); } catch { /* noop */ }
    }
    set({ ws: null, isConnected: false });
  },

  // ── Mutaciones de estado ─────────────────────────────────────
  pushAlerta: (data) =>
    set((s) => {
      const id = data.alerta_id ?? data.id;
      const exists = id != null && s.alertas.some((a) => (a.alerta_id ?? a.id) === id);
      if (exists) return s;
      return { alertas: [data, ...s.alertas] };
    }),

  setAlertas: (alertas) => set({ alertas }),

  resolverLocal: (id) =>
    set((s) => ({
      alertas: s.alertas.filter((a) => (a.alerta_id ?? a.id) !== id),
    })),

  reset: () => set({ alertas: [], ws: null, isConnected: false }),
}));

export default useAlertasStore;
