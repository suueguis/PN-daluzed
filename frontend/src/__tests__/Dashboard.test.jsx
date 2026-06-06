import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import MockAdapter from 'axios-mock-adapter';
import axiosClient from '../api/axiosClient';
import useAuthStore from '../store/authStore';
import Dashboard from '../pages/Dashboard';

let mock;
let qc;

beforeEach(() => {
  mock = new MockAdapter(axiosClient);
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ user: { role: 'ADMIN' }, isAuthenticated: true, accessToken: 'tkn' });

  mock.onGet('/catalogo/materias-primas/').reply(200, { results: [], count: 0 });
  mock.onGet('/alertas/activas/').reply(200, []);
  mock.onGet('/produccion/batidos/').reply(200, { results: [], count: 0 });
  mock.onGet('/indicadores/kpis/').reply((config) => {
    const tipo = config.params?.tipo;
    if (tipo === 'stock') return [200, { stock_por_bodega: [] }];
    return [200, { lotes_por_vencer: [] }];
  });
  mock.onGet('/indicadores/utilizacion-bodega/').reply(200, { utilizacion_por_zona: [] });
  mock.onGet('/indicadores/resumen/').reply(200, {
    stock_bp_total: '0',
    rotacion_inventario: 0,
    periodo_rotacion: '2026-05-07 al 2026-06-06',
    batidos_semana: [],
    lotes_por_vencer_count: 0,
    oc_pendientes: 0,
  });
});

afterEach(() => {
  mock.restore();
});

function renderDashboard() {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Dashboard', () => {
  it('renderiza las 6 tarjetas resumen', async () => {
    renderDashboard();
    expect(await screen.findByText('Materias primas')).toBeInTheDocument();
    expect(screen.getByText('Alertas activas')).toBeInTheDocument();
    expect(screen.getByText('Batidos del día')).toBeInTheDocument();
    expect(screen.getByText('Stock Bodega Principal')).toBeInTheDocument();
    expect(screen.getByText('Rotación inventario')).toBeInTheDocument();
    expect(screen.getByText('OC pendientes')).toBeInTheDocument();
  });

  it('muestra saludo con rol del usuario', async () => {
    renderDashboard();
    expect(await screen.findByText(/Hola,/i)).toBeInTheDocument();
    expect(screen.getByText(/Admin/)).toBeInTheDocument();
  });

  it('muestra mensaje vacío cuando no hay lotes próximos a vencer', async () => {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText(/No hay lotes próximos a vencer/i)).toBeInTheDocument(),
    );
  });

  it('muestra sección de exportación con botones Excel y PDF', async () => {
    renderDashboard();
    expect(await screen.findByText('Exportar inventario')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /excel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pdf/i })).toBeInTheDocument();
  });

  it('muestra tabla con lotes por vencer cuando los hay', async () => {
    mock.onGet('/indicadores/kpis/').reply((config) => {
      const tipo = config.params?.tipo;
      if (tipo === 'stock') return [200, { stock_por_bodega: [] }];
      return [200, {
        lotes_por_vencer: [{
          lote_id: 1,
          materia_prima: 'Harina trigo',
          bodega: 'Bodega Principal',
          cantidad: '5000.00',
          fecha_vencimiento: '2026-06-10',
          dias_restantes: 7,
        }],
      }];
    });

    renderDashboard();
    expect(await screen.findByText('Harina trigo')).toBeInTheDocument();
    expect(screen.getByText('Bodega Principal')).toBeInTheDocument();
  });
});
