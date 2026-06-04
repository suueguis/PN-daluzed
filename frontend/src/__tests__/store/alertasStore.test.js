import { describe, it, expect, beforeEach, vi } from 'vitest';

import useAlertasStore from '../../store/alertasStore';

// ── Mock global de WebSocket ──────────────────────────────────────────
class MockWebSocket {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    MockWebSocket.instances.push(this);
  }
  close() {
    this.readyState = 3;
    this.onclose?.({});
  }
  // Helpers para los tests
  _open() {
    this.readyState = 1;
    this.onopen?.({});
  }
  _emit(payload) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

// Mock de sonner para evitar imports laterales del Toaster
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error:   vi.fn(),
  }),
}));

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
  vi.stubGlobal('location', {
    protocol: 'http:',
    host:     'localhost:5173',
  });
  useAlertasStore.getState().reset();
});

describe('alertasStore', () => {
  it('connect() inicializa la conexión WebSocket', () => {
    useAlertasStore.getState().connect();

    expect(MockWebSocket.instances).toHaveLength(1);
    const ws = MockWebSocket.instances[0];
    expect(ws.url).toMatch(/\/ws\/alertas\/$/);
    expect(useAlertasStore.getState().ws).toBe(ws);
  });

  it('marca isConnected=true en onopen', () => {
    useAlertasStore.getState().connect();
    MockWebSocket.instances[0]._open();
    expect(useAlertasStore.getState().isConnected).toBe(true);
  });

  it('procesa onmessage y agrega la alerta al estado', async () => {
    const { toast } = await import('sonner');
    useAlertasStore.getState().connect();

    MockWebSocket.instances[0]._emit({
      alerta_id: 42,
      tipo:      'STOCK_BAJO',
      mensaje:   'Stock bajo',
    });

    const { alertas } = useAlertasStore.getState();
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({ alerta_id: 42, tipo: 'STOCK_BAJO' });
    expect(toast).toHaveBeenCalledWith(
      expect.stringContaining('Stock bajo'),
      expect.any(Object),
    );
  });

  it('no duplica una alerta con el mismo id', () => {
    useAlertasStore.getState().connect();
    MockWebSocket.instances[0]._emit({ alerta_id: 1, tipo: 'STOCK_BAJO', mensaje: 'x' });
    MockWebSocket.instances[0]._emit({ alerta_id: 1, tipo: 'STOCK_BAJO', mensaje: 'x' });
    expect(useAlertasStore.getState().alertas).toHaveLength(1);
  });

  it('disconnect() cierra el WebSocket y resetea isConnected', () => {
    useAlertasStore.getState().connect();
    const ws = MockWebSocket.instances[0];
    const closeSpy = vi.spyOn(ws, 'close');

    useAlertasStore.getState().disconnect();

    expect(closeSpy).toHaveBeenCalled();
    expect(useAlertasStore.getState().ws).toBeNull();
    expect(useAlertasStore.getState().isConnected).toBe(false);
  });
});
